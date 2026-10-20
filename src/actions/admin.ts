'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { appOrigin, requireAdmin, requireResultsEditor } from '@/lib/auth/current';
import { createResetToken } from '@/lib/auth/service';
import { notifyNewEditor } from '@/lib/push/editor-notice';
import { composeResetNotice } from '@/lib/push/reminder-text';
import { notifyMatchReset } from '@/lib/push/reset-notice';
import { pushConfigured, webPushSender } from '@/lib/push/service';
import { getSettings } from '@/lib/match/queries';
import { resetMatch } from '@/lib/match/reset';
import { DomainError } from '@/lib/services/player';
import { deleteUser, dismissResetRequest, enrolUser, getUser, updateSettings, updateUser } from '@/lib/services/admin';
import {
  adminUpdateUserSchema,
  enrolSchema,
  fieldErrors,
  parseScorers,
  resetMatchSchema,
  resultSchema,
  settingsSchema,
} from '@/lib/validators';
import { saveMatchResult, scorerExcess } from '@/lib/match/goals';
import type { FormState } from './form-state';

const optional = (v: FormDataEntryValue | null) => (v === null || v === '' ? undefined : v);

export async function enrolUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = enrolSchema.safeParse({
    username: formData.get('username') ?? '',
    displayName: formData.get('displayName') ?? '',
    team: optional(formData.get('team')),
    role: optional(formData.get('role')),
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  const db = await getDb();
  try {
    const id = await enrolUser(db, admin.id, parsed.data);
    const token = await createResetToken(db, id, admin.id);
    refresh();
    return {
      status: 'success',
      message: 'admin.enrolled',
      data: { name: parsed.data.displayName, url: `${await appOrigin()}/restablecer/${token}` },
    };
  } catch (e) {
    if (e instanceof DomainError && e.code === 'duplicate') {
      return { status: 'error', errors: { username: 'admin.duplicate' } };
    }
    throw e;
  }
}

export async function updateUserAction(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = adminUpdateUserSchema.safeParse({
    displayName: formData.get('displayName') ?? '',
    team: optional(formData.get('team')) ?? null,
    role: formData.get('role'),
    longTermAbsence: formData.get('longTermAbsence') === 'on',
    absenceNote: optional(formData.get('absenceNote')) ?? null,
    canBringGuests: formData.get('canBringGuests') === 'on',
    active: formData.get('active') === 'on',
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  const db = await getDb();
  let promotedToEditor = false;
  try {
    ({ promotedToEditor } = await updateUser(db, admin.id, userId, parsed.data));
  } catch (e) {
    if (e instanceof DomainError && e.code === 'self_lockout') return { status: 'error', message: 'admin.selfLockout' };
    if (e instanceof DomainError && e.code === 'has_guests') return { status: 'error', message: 'admin.hasGuests' };
    throw e;
  }
  if (promotedToEditor && pushConfigured()) {
    const t = await getTranslations('push');
    // Best effort: a failed notification must not undo or fail the saved role change.
    await notifyNewEditor(db, userId, webPushSender(), { title: t('editorTitle'), body: t('editorBody') }).catch(
      () => undefined,
    );
  }
  refresh();
  return { status: 'success', message: 'admin.saved' };
}

export async function createResetLinkAction(userId: string): Promise<FormState> {
  const admin = await requireAdmin();
  const db = await getDb();
  const user = await getUser(db, userId);
  if (!user) return { status: 'error', message: 'errors.generic' };
  const token = await createResetToken(db, userId, admin.id);
  return { status: 'success', data: { name: user.displayName, url: `${await appOrigin()}/restablecer/${token}` } };
}

export async function dismissResetRequestAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  await dismissResetRequest(await getDb(), admin.id, String(formData.get('userId') ?? ''));
  refresh();
}

/** Confirmed by typing the player's username (any case), so the wrong player can't be deleted by mistake. */
export async function deleteUserAction(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const db = await getDb();
  const user = await getUser(db, userId);
  if (!user) return { status: 'error', message: 'errors.generic' };
  const typed = String(formData.get('confirm') ?? '')
    .trim()
    .toUpperCase();
  if (typed !== user.username) return { status: 'error', errors: { confirm: 'confirmWord' } };
  try {
    await deleteUser(db, admin.id, userId);
  } catch (e) {
    if (e instanceof DomainError && e.code === 'self_lockout')
      return { status: 'error', message: 'admin.deleteUser.self' };
    if (e instanceof DomainError && e.code === 'not_found') return { status: 'error', message: 'errors.generic' };
    throw e;
  }
  redirect('/admin/usuarios?eliminado=1');
}

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };
  await updateSettings(await getDb(), admin.id, parsed.data);
  refresh();
  return { status: 'success', message: 'admin.settingsSaved' };
}

export async function resetMatchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = resetMatchSchema.safeParse({
    matchId: formData.get('matchId') ?? '',
    confirm: formData.get('confirm') ?? '',
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  const db = await getDb();
  let reset: Awaited<ReturnType<typeof resetMatch>>;
  try {
    reset = await resetMatch(db, admin.id, parsed.data.matchId);
  } catch (e) {
    if (e instanceof DomainError && (e.code === 'stale' || e.code === 'started')) {
      return { status: 'error', message: `admin.reset.${e.code}` };
    }
    throw e;
  }
  if (pushConfigured()) {
    const { timezone } = await getSettings(db);
    const text = await composeResetNotice(reset.match, timezone);
    // Best effort: the reset is done even if a notification can't be delivered.
    await notifyMatchReset(db, reset.match, admin.id, webPushSender(), text).catch(() => undefined);
  }
  refresh();
  return {
    status: 'success',
    message: 'admin.reset.done',
    data: { answers: String(reset.answers), guests: String(reset.guests) },
  };
}

export async function saveResultAction(matchId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const editor = await requireResultsEditor();
  const parsed = resultSchema.safeParse({ blancos: formData.get('blancos') ?? '', color: formData.get('color') ?? '' });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };
  const scorers = parseScorers(formData.get('scorers'));
  if (!scorers) return { status: 'error', message: 'errors.generic' };
  if (scorerExcess(parsed.data, scorers).length > 0) {
    return { status: 'error', errors: { scorers: 'result.tooManyScorers' } };
  }
  try {
    await saveMatchResult(await getDb(), editor.id, matchId, parsed.data, scorers);
  } catch (e) {
    if (e instanceof DomainError) return { status: 'error', message: 'errors.generic' };
    throw e;
  }
  refresh();
  return { status: 'success', message: 'results.saved' };
}
