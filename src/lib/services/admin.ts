import { and, asc, count, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '@/lib/db/create';
import {
  attendances,
  auditLog,
  guests,
  matches,
  passwordResetRequests,
  passwordResetTokens,
  pushSubscriptions,
  sessions,
  settings,
  users,
} from '@/lib/db/schema';
import type { adminUpdateUserSchema, enrolSchema, settingsSchema } from '@/lib/validators';
import { invalidateUserSessions } from '@/lib/auth/sessions';
import { DomainError } from './player';

export async function listResetRequests(db: Db) {
  return db
    .select({
      userId: passwordResetRequests.userId,
      requestedAt: passwordResetRequests.requestedAt,
      displayName: users.displayName,
      username: users.username,
    })
    .from(passwordResetRequests)
    .innerJoin(users, eq(users.id, passwordResetRequests.userId))
    .orderBy(asc(passwordResetRequests.requestedAt));
}

export async function countResetRequests(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(passwordResetRequests);
  return row?.n ?? 0;
}

export async function dismissResetRequest(db: Db, actorId: string, userId: string) {
  const deleted = await db
    .delete(passwordResetRequests)
    .where(eq(passwordResetRequests.userId, userId))
    .returning({ userId: passwordResetRequests.userId });
  if (deleted.length)
    await db.insert(auditLog).values({ actorId, action: 'reset_request_dismissed', targetId: userId });
}

export async function listUsers(db: Db) {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      team: users.team,
      longTermAbsence: users.longTermAbsence,
      active: users.active,
      hasPassword: users.passwordHash,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.displayName))
    .then((rows) => rows.map(({ hasPassword, ...r }) => ({ ...r, hasPassword: Boolean(hasPassword) })));
}

export async function getUser(db: Db, id: string) {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      team: users.team,
      longTermAbsence: users.longTermAbsence,
      absenceNote: users.absenceNote,
      canBringGuests: users.canBringGuests,
      active: users.active,
    })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  return row ?? null;
}

export async function enrolUser(db: Db, actorId: string, input: z.output<typeof enrolSchema>) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, input.username));
  if (existing) throw new DomainError('duplicate');
  const [created] = await db
    .insert(users)
    .values({ username: input.username, displayName: input.displayName, team: input.team, role: input.role })
    .returning({ id: users.id });
  await db.insert(auditLog).values({ actorId, action: 'user_enrolled', targetId: created.id });
  return created.id;
}

/** Guests the player has signed up for matches that haven't kicked off yet. */
export async function countUpcomingGuests(db: Db, hostId: string, now = new Date()) {
  const [row] = await db
    .select({ n: count() })
    .from(guests)
    .innerJoin(matches, eq(matches.id, guests.matchId))
    .where(and(eq(guests.hostId, hostId), gt(matches.startsAt, now)));
  return row?.n ?? 0;
}

export async function updateUser(
  db: Db,
  actorId: string,
  userId: string,
  input: z.output<typeof adminUpdateUserSchema>,
  now = new Date(),
) {
  if (actorId === userId && (input.role !== 'admin' || !input.active)) throw new DomainError('self_lockout');
  const [before] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!before) throw new DomainError('not_found');
  // Only the player can remove his guests, so the permission stays until they're gone or the match starts.
  if (before.canBringGuests && !input.canBringGuests && (await countUpcomingGuests(db, userId, now)) > 0) {
    throw new DomainError('has_guests');
  }

  await db
    .update(users)
    .set({ ...input, absenceNote: input.longTermAbsence ? input.absenceNote : null })
    .where(eq(users.id, userId));
  if (!input.active) await invalidateUserSessions(db, userId);

  const changed = (['displayName', 'team', 'role', 'longTermAbsence', 'canBringGuests', 'active'] as const).filter(
    (k) => before[k] !== input[k],
  );
  if (changed.length) {
    await db.insert(auditLog).values({ actorId, action: 'user_updated', targetId: userId, details: changed.join(',') });
  }
  return { promotedToEditor: before.role !== 'editor' && input.role === 'editor' };
}

export async function updateSettings(db: Db, actorId: string, input: z.output<typeof settingsSchema>) {
  await db.update(settings).set(input).where(eq(settings.id, 1));
  await db.insert(auditLog).values({ actorId, action: 'settings_updated' });
}

/**
 * Deletes a player for good: account, devices, links and plans for matches not yet played go. The row stays,
 * renamed out of the way and tagged, so past answers, goals and results keep their name.
 */
export async function deleteUser(db: Db, actorId: string, userId: string, now = new Date()) {
  if (actorId === userId) throw new DomainError('self_lockout');
  const [user] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!user) throw new DomainError('not_found');

  await db.transaction(async (tx) => {
    const upcoming = tx.select({ id: matches.id }).from(matches).where(gt(matches.startsAt, now));
    await tx.delete(attendances).where(and(eq(attendances.userId, userId), inArray(attendances.matchId, upcoming)));
    await tx.delete(guests).where(and(eq(guests.hostId, userId), inArray(guests.matchId, upcoming)));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, userId));
    await tx
      .update(users)
      .set({
        // "~" can't be enrolled, so this never clashes and the old username is free again.
        username: `~${userId.replaceAll('-', '').slice(0, 29)}`,
        passwordHash: null,
        mustChangePassword: false,
        role: 'player',
        longTermAbsence: false,
        absenceNote: null,
        canBringGuests: false,
        active: false,
        deletedAt: now,
      })
      .where(eq(users.id, userId));
    await tx.insert(auditLog).values({ actorId, action: 'user_deleted', targetId: userId, details: user.displayName });
  });
  return user;
}
