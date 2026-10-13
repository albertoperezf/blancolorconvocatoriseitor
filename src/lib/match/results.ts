import { and, desc, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { auditLog, matches } from '@/lib/db/schema';
import { DomainError } from '@/lib/services/player';

/** First match with recorded results; RESULTS_FROM (ISO date) can move it for local testing. */
export function resultsFrom(): Date {
  return new Date(process.env.RESULTS_FROM ?? '2026-10-15T00:00:00+02:00');
}

export type Winner = 'blancos' | 'color' | 'draw';

export function matchWinner(blancosGoals: number, colorGoals: number): Winner {
  if (blancosGoals > colorGoals) return 'blancos';
  if (colorGoals > blancosGoals) return 'color';
  return 'draw';
}

/** Matches that have already kicked off since results started, newest first. */
export function listPlayedMatches(db: Db, now: Date = new Date()) {
  return db
    .select({
      id: matches.id,
      startsAt: matches.startsAt,
      blancosGoals: matches.blancosGoals,
      colorGoals: matches.colorGoals,
    })
    .from(matches)
    .where(and(gte(matches.startsAt, resultsFrom()), lte(matches.startsAt, now)))
    .orderBy(desc(matches.startsAt));
}

export async function setMatchResult(
  db: Db,
  actorId: string,
  matchId: string,
  goals: { blancos: number; color: number },
  now: Date = new Date(),
) {
  const updated = await db
    .update(matches)
    .set({ blancosGoals: goals.blancos, colorGoals: goals.color })
    .where(and(eq(matches.id, matchId), gte(matches.startsAt, resultsFrom()), lte(matches.startsAt, now)))
    .returning({ id: matches.id });
  if (updated.length === 0) throw new DomainError('not_found');
  await db.insert(auditLog).values({
    actorId,
    action: 'result_saved',
    targetId: matchId,
    details: `${goals.blancos}-${goals.color}`,
  });
}
