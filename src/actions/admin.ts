'use server';

import { refresh } from 'next/cache';
import { getDb } from '@/lib/db';
import { appOrigin, requireAdmin } from '@/lib/auth/current';
import { createResetToken } from '@/lib/auth/service';
import { DomainError } from '@/lib/services/player';
import { dismissResetRequest, enrolUser, getUser, updateSettings, updateUser } from '@/lib/services/admin';
import { adminUpdateUserSchema, enrolSchema, fieldErrors, settingsSchema } from '@/lib/validators';
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
    active: formData.get('active') === 'on',
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  try {
    await updateUser(await getDb(), admin.id, userId, parsed.data);
  } catch (e) {
    if (e instanceof DomainError && e.code === 'self_lockout') return { status: 'error', message: 'admin.selfLockout' };
    throw e;
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

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };
  await updateSettings(await getDb(), admin.id, parsed.data);
  refresh();
  return { status: 'success', message: 'admin.settingsSaved' };
}
