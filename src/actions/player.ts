'use server';

import { refresh } from 'next/cache';
import { getDb } from '@/lib/db';
import { getSessionToken, requireUser } from '@/lib/auth/current';
import { changePassword } from '@/lib/auth/service';
import { invalidateUserSessions } from '@/lib/auth/sessions';
import { ensureCurrentMatch } from '@/lib/match/queries';
import { addGuest, DomainError, removeGuest, setAttendance, setTeamAndPosition } from '@/lib/services/player';
import {
  changePasswordSchema,
  decisionSchema,
  fieldErrors,
  guestNameSchema,
  positionSchema,
  teamSchema,
} from '@/lib/validators';
import type { FormState } from './form-state';

export async function setAttendanceAction(decision: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = decisionSchema.safeParse(decision);
  if (!parsed.success) return { ok: false, error: 'status.error' };

  const db = await getDb();
  const match = await ensureCurrentMatch(db);
  await setAttendance(db, user.id, match.id, parsed.data);
  refresh();
  return { ok: true };
}

export async function addGuestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = guestNameSchema.safeParse(formData.get('name') ?? '');
  if (!name.success) return { status: 'error', errors: { name: name.error.issues[0].message } };

  const db = await getDb();
  const match = await ensureCurrentMatch(db);
  try {
    await addGuest(db, user.id, match.id, name.data);
  } catch (e) {
    if (e instanceof DomainError && e.code === 'forbidden') {
      return { status: 'error', errors: { name: 'guests.notAllowed' } };
    }
    throw e;
  }
  refresh();
  return { status: 'success', message: 'guests.added', data: { name: name.data } };
}

export async function removeGuestAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  try {
    await removeGuest(await getDb(), user.id, id);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
  }
  refresh();
}

export async function updatePlayingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const team = teamSchema.safeParse(formData.get('team'));
  const rawPosition = formData.get('position');
  const position = rawPosition === null ? null : positionSchema.safeParse(rawPosition);
  const errors: Record<string, string> = {};
  if (!team.success) errors.team = 'team.required';
  if (position && !position.success) errors.position = 'position.required';
  if (!team.success || (position && !position.success)) return { status: 'error', errors };
  await setTeamAndPosition(await getDb(), user.id, team.data, position?.data);
  refresh();
  return { status: 'success', message: 'profile.playingSaved' };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    current: formData.get('current'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  const ok = await changePassword(
    await getDb(),
    user.id,
    parsed.data.current,
    parsed.data.password,
    await getSessionToken(),
  );
  if (!ok) return { status: 'error', errors: { current: 'profile.wrongCurrent' } };
  return { status: 'success', message: 'profile.passwordSaved' };
}

export async function closeOtherSessionsAction(): Promise<FormState> {
  const user = await requireUser();
  await invalidateUserSessions(await getDb(), user.id, await getSessionToken());
  return { status: 'success', message: 'profile.closedOthers' };
}
