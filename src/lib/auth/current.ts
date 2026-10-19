import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { canEditResults } from './roles';
import { validateSessionToken, type SessionUser } from './sessions';

const isProd = process.env.NODE_ENV === 'production';
// __Host- requires Secure + Path=/ + no Domain, which pins the cookie to this exact origin.
export const SESSION_COOKIE = isProd ? '__Host-session' : 'session';

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function deleteSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  const result = await validateSessionToken(await getDb(), token);
  return result?.user ?? null;
});

/** For pages and actions that need a fully onboarded player. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword || !user.team) redirect('/bienvenida');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/partido');
  return user;
}

/** Admins and editors: may enter results and goalscorers on Resultados. */
export async function requireResultsEditor(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canEditResults(user.role)) redirect('/partido');
  return user;
}

export async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
