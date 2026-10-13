'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { deleteSessionCookie, getCurrentUser, getSessionToken, setSessionCookie } from '@/lib/auth/current';
import { consumeResetToken, login, setPassword } from '@/lib/auth/service';
import { invalidateSession, invalidateUserSessions } from '@/lib/auth/sessions';
import { setTeam } from '@/lib/services/player';
import { fieldErrors, loginSchema, newPasswordSchema, teamSchema } from '@/lib/validators';
import type { FormState } from './form-state';

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username') ?? '',
    password: formData.get('password') ?? '',
  });
  if (!parsed.success) return { status: 'error', message: 'login.invalid' };

  const result = await login(await getDb(), parsed.data.username, parsed.data.password);
  if (!result.ok) return { status: 'error', message: 'login.invalid' };
  await setSessionCookie(result.token, result.expiresAt);
  redirect('/partido');
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) await invalidateSession(await getDb(), token);
  await deleteSessionCookie();
  redirect('/');
}

export async function completeOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const errors: Record<string, string> = {};
  const team = teamSchema.safeParse(formData.get('team'));
  if (!team.success) errors.team = 'team.required';

  let password: string | undefined;
  if (user.mustChangePassword) {
    const pw = newPasswordSchema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') });
    if (pw.success) password = pw.data.password;
    else Object.assign(errors, fieldErrors(pw.error));
  }
  if (Object.keys(errors).length || !team.success) return { status: 'error', errors };

  const db = await getDb();
  if (password) {
    await setPassword(db, user.id, password);
    await invalidateUserSessions(db, user.id, await getSessionToken());
  }
  await setTeam(db, user.id, team.data);
  redirect('/partido');
}

export async function resetPasswordAction(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const pw = newPasswordSchema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') });
  if (!pw.success) return { status: 'error', errors: fieldErrors(pw.error) };

  const session = await consumeResetToken(await getDb(), token, pw.data.password);
  if (!session) return { status: 'error', message: 'reset.invalid' };
  await setSessionCookie(session.token, session.expiresAt);
  redirect('/partido');
}
