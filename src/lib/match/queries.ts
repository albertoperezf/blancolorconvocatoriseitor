import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { attendances, guests, matches, settings, users } from '@/lib/db/schema';
import { currentMatchStart } from './schedule';
import { groupSquad, type Squad } from './squad';

export const DEFAULT_SETTINGS = {
  id: 1,
  weekday: 4,
  kickoffTime: '20:30',
  timezone: 'Europe/Madrid',
  venue: 'Polideportivo La Concepción',
  address: 'C. de José del Hierro, 5, Ciudad Lineal, 28027 Concepción, Madrid',
  rolloverHours: 2,
} as const;

export type Settings = typeof settings.$inferSelect;
export type Match = typeof matches.$inferSelect;

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db.insert(settings).values(DEFAULT_SETTINGS).onConflictDoNothing().returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0];
}

/** Matches are created lazily the first time anyone asks for the current week. */
export async function ensureCurrentMatch(db: Db, now: Date = new Date()): Promise<Match> {
  const s = await getSettings(db);
  const startsAt = currentMatchStart(now, s);
  await db.insert(matches).values({ startsAt, venue: s.venue }).onConflictDoNothing();
  const [match] = await db.select().from(matches).where(eq(matches.startsAt, startsAt));
  return match;
}

export async function getSquad(db: Db, matchId: string): Promise<Squad> {
  const players = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      team: users.team,
      longTermAbsence: users.longTermAbsence,
      decision: attendances.decision,
    })
    .from(users)
    .leftJoin(attendances, and(eq(attendances.userId, users.id), eq(attendances.matchId, matchId)))
    .where(eq(users.active, true));

  const guestRows = await db
    .select({ id: guests.id, name: guests.name, hostId: guests.hostId, hostName: users.displayName })
    .from(guests)
    .innerJoin(users, eq(users.id, guests.hostId))
    .where(eq(guests.matchId, matchId))
    .orderBy(asc(guests.createdAt));

  return groupSquad(players, guestRows);
}
