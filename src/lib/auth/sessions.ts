import { and, eq, lt, ne } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { sessions, users } from '@/lib/db/schema';
import { generateToken, hashToken } from './tokens';

const DAY_MS = 86_400_000;
export const SESSION_TTL_MS = 30 * DAY_MS;
const RENEW_WHEN_LEFT_MS = 15 * DAY_MS;

export type SessionUser = Pick<
  typeof users.$inferSelect,
  'id' | 'username' | 'displayName' | 'role' | 'team' | 'longTermAbsence' | 'mustChangePassword'
>;

export async function createSession(db: Db, userId: string, now = new Date()) {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

/** Returns the user for a valid token (sliding expiry), or null. */
export async function validateSessionToken(
  db: Db,
  token: string,
  now = new Date(),
): Promise<{ user: SessionUser; expiresAt: Date } | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        team: users.team,
        longTermAbsence: users.longTermAbsence,
        mustChangePassword: users.mustChangePassword,
        active: users.active,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id));

  if (!row) return null;
  if (row.expiresAt.getTime() <= now.getTime() || !row.user.active) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  let expiresAt = row.expiresAt;
  if (expiresAt.getTime() - now.getTime() < RENEW_WHEN_LEFT_MS) {
    expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
  }

  const { id: userId, username, displayName, role, team, longTermAbsence, mustChangePassword } = row.user;
  return { user: { id: userId, username, displayName, role, team, longTermAbsence, mustChangePassword }, expiresAt };
}

export async function invalidateSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function invalidateUserSessions(db: Db, userId: string, exceptToken?: string) {
  const byUser = eq(sessions.userId, userId);
  await db.delete(sessions).where(exceptToken ? and(byUser, ne(sessions.id, hashToken(exceptToken))) : byUser);
}

export async function purgeExpiredSessions(db: Db, now = new Date()) {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
