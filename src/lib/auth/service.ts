import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { auditLog, passwordResetTokens, users } from '@/lib/db/schema';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password';
import { createSession, invalidateUserSessions } from './sessions';
import { generateToken, hashToken } from './tokens';

export type LoginResult = { ok: true; token: string; expiresAt: Date } | { ok: false; error: 'invalid' };

export async function login(db: Db, username: string, password: string): Promise<LoginResult> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  const valid =
    user?.active && user.passwordHash
      ? await verifyPassword(user.passwordHash, password)
      : await verifyAgainstDummy(password);
  if (!valid || !user) return { ok: false, error: 'invalid' };

  const session = await createSession(db, user.id);
  return { ok: true, ...session };
}

export async function changePassword(
  db: Db,
  userId: string,
  current: string,
  next: string,
  keepToken?: string,
): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, current))) return false;
  await setPassword(db, userId, next);
  await invalidateUserSessions(db, userId, keepToken);
  return true;
}

export async function setPassword(db: Db, userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, userId));
}

const RESET_TTL_MS = 24 * 3_600_000;

export async function createResetToken(db: Db, userId: string, actorId: string | null, now = new Date()) {
  const token = generateToken();
  // Only the latest link for a user stays valid.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({
    tokenHash: hashToken(token),
    userId,
    createdBy: actorId,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
  });
  await db.insert(auditLog).values({ actorId, action: 'reset_link_created', targetId: userId });
  return token;
}

export async function findValidResetToken(db: Db, token: string, now = new Date()) {
  const [row] = await db
    .select({ userId: passwordResetTokens.userId, displayName: users.displayName, username: users.username })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
        eq(users.active, true),
      ),
    );
  return row ?? null;
}

/** Sets the new password, burns the link, closes every old session and opens a fresh one. */
export async function consumeResetToken(db: Db, token: string, password: string, now = new Date()) {
  const row = await findValidResetToken(db, token, now);
  if (!row) return null;
  const [burned] = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), isNull(passwordResetTokens.usedAt)))
    .returning();
  if (!burned) return null;

  await setPassword(db, row.userId, password);
  await invalidateUserSessions(db, row.userId);
  await db.insert(auditLog).values({ actorId: row.userId, action: 'password_reset', targetId: row.userId });
  return createSession(db, row.userId, now);
}
