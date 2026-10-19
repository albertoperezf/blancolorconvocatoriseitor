import { count, eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { attendances, auditLog, guests } from '@/lib/db/schema';
import { DomainError } from '@/lib/services/player';
import { ensureCurrentMatch, type Match } from './queries';

export type ResetSummary = { going: number; maybe: number; notGoing: number; guests: number; started: boolean };

export async function resetSummary(db: Db, match: Match, now = new Date()): Promise<ResetSummary> {
  const answers = await db
    .select({ decision: attendances.decision, n: count() })
    .from(attendances)
    .where(eq(attendances.matchId, match.id))
    .groupBy(attendances.decision);
  const [guestRow] = await db.select({ n: count() }).from(guests).where(eq(guests.matchId, match.id));
  const by = (d: string) => answers.find((r) => r.decision === d)?.n ?? 0;
  return {
    going: by('going'),
    maybe: by('maybe'),
    notGoing: by('not_going'),
    guests: guestRow?.n ?? 0,
    started: match.startsAt <= now,
  };
}

/**
 * Deletes every answer and guest of the upcoming match. Refuses if the week rolled over since the admin
 * loaded the page (`stale`) or the match already kicked off (`started`): that one counts for attendance.
 */
export async function resetMatch(db: Db, actorId: string, matchId: string, now = new Date()) {
  const match = await ensureCurrentMatch(db, now);
  if (match.id !== matchId) throw new DomainError('stale');
  if (match.startsAt <= now) throw new DomainError('started');

  const deleted = await db.transaction(async (tx) => {
    const g = await tx.delete(guests).where(eq(guests.matchId, matchId)).returning({ id: guests.id });
    const a = await tx
      .delete(attendances)
      .where(eq(attendances.matchId, matchId))
      .returning({ userId: attendances.userId });
    await tx.insert(auditLog).values({
      actorId,
      action: 'match_reset',
      targetId: matchId,
      details: `answers:${a.length},guests:${g.length}`,
    });
    return { answers: a.length, guests: g.length };
  });
  return { match, ...deleted };
}
