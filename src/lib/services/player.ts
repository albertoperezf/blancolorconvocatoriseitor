import { and, eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { attendances, guests, users, type Decision, type Position, type Team } from '@/lib/db/schema';

export class DomainError extends Error {
  constructor(public readonly code: 'not_found' | 'forbidden' | 'duplicate' | 'self_lockout' | 'has_guests') {
    super(code);
  }
}

export async function setAttendance(db: Db, userId: string, matchId: string, decision: Decision | null) {
  const key = and(eq(attendances.matchId, matchId), eq(attendances.userId, userId));
  if (decision === null) {
    await db.delete(attendances).where(key);
    return;
  }
  await db
    .insert(attendances)
    .values({ matchId, userId, decision })
    .onConflictDoUpdate({
      target: [attendances.matchId, attendances.userId],
      set: { decision, updatedAt: new Date() },
    });
}

export async function getMyDecision(db: Db, userId: string, matchId: string): Promise<Decision | null> {
  const [row] = await db
    .select({ decision: attendances.decision })
    .from(attendances)
    .where(and(eq(attendances.matchId, matchId), eq(attendances.userId, userId)));
  return row?.decision ?? null;
}

export async function addGuest(db: Db, hostId: string, matchId: string, name: string) {
  const [host] = await db.select({ canBringGuests: users.canBringGuests }).from(users).where(eq(users.id, hostId));
  if (!host) throw new DomainError('not_found');
  if (!host.canBringGuests) throw new DomainError('forbidden');
  const [row] = await db.insert(guests).values({ hostId, matchId, name }).returning();
  return row;
}

export async function removeGuest(db: Db, hostId: string, guestId: string) {
  const deleted = await db
    .delete(guests)
    .where(and(eq(guests.id, guestId), eq(guests.hostId, hostId)))
    .returning({ id: guests.id });
  if (deleted.length === 0) throw new DomainError('not_found');
}

export async function getMyGuests(db: Db, hostId: string, matchId: string) {
  return db
    .select({ id: guests.id, name: guests.name })
    .from(guests)
    .where(and(eq(guests.hostId, hostId), eq(guests.matchId, matchId)))
    .orderBy(guests.createdAt);
}

export async function setTeam(db: Db, userId: string, team: Team) {
  await db.update(users).set({ team }).where(eq(users.id, userId));
}

/** Team is always set; position only when given, so players who never picked one can still save their team. */
export async function setTeamAndPosition(db: Db, userId: string, team: Team, position?: Position) {
  await db
    .update(users)
    .set(position ? { team, position } : { team })
    .where(eq(users.id, userId));
}
