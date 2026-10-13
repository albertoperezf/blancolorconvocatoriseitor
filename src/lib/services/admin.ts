import { asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '@/lib/db/create';
import { auditLog, settings, users } from '@/lib/db/schema';
import type { adminUpdateUserSchema, enrolSchema, settingsSchema } from '@/lib/validators';
import { invalidateUserSessions } from '@/lib/auth/sessions';
import { DomainError } from './player';

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
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, id));
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

export async function updateUser(
  db: Db,
  actorId: string,
  userId: string,
  input: z.output<typeof adminUpdateUserSchema>,
) {
  if (actorId === userId && (input.role !== 'admin' || !input.active)) throw new DomainError('self_lockout');
  const [before] = await db.select().from(users).where(eq(users.id, userId));
  if (!before) throw new DomainError('not_found');

  await db
    .update(users)
    .set({ ...input, absenceNote: input.longTermAbsence ? input.absenceNote : null })
    .where(eq(users.id, userId));
  if (!input.active) await invalidateUserSessions(db, userId);

  const changed = (['displayName', 'team', 'role', 'longTermAbsence', 'active'] as const).filter(
    (k) => before[k] !== input[k],
  );
  if (changed.length) {
    await db.insert(auditLog).values({ actorId, action: 'user_updated', targetId: userId, details: changed.join(',') });
  }
}

export async function updateSettings(db: Db, actorId: string, input: z.output<typeof settingsSchema>) {
  await db.update(settings).set(input).where(eq(settings.id, 1));
  await db.insert(auditLog).values({ actorId, action: 'settings_updated' });
}
