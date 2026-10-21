import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { auditLog, matches } from '@/lib/db/schema';
import { DomainError } from '@/lib/services/player';
import { ensureCurrentMatch, getCancelledMatch, type Match } from './queries';

/** Calls off the open match; answers and guests are kept so reactivating brings them back. */
export async function cancelMatch(
  db: Db,
  actorId: string,
  matchId: string,
  reason: string,
  now = new Date(),
): Promise<Match> {
  const match = await ensureCurrentMatch(db, now);
  if (match.id !== matchId) throw new DomainError('stale');
  return db.transaction(async (tx) => {
    const [cancelled] = await tx
      .update(matches)
      .set({ cancelledAt: now, cancelReason: reason, cancelledBy: actorId })
      .where(and(eq(matches.id, matchId), isNull(matches.cancelledAt)))
      .returning();
    if (!cancelled) throw new DomainError('stale');
    await tx.insert(auditLog).values({ actorId, action: 'match_cancelled', targetId: matchId, details: reason });
    return cancelled;
  });
}

/** Undoes a cancellation while that match is still this week's one. */
export async function restoreMatch(db: Db, actorId: string, matchId: string, now = new Date()): Promise<Match> {
  const cancelled = await getCancelledMatch(db, now);
  if (cancelled?.id !== matchId) throw new DomainError('stale');
  return db.transaction(async (tx) => {
    const [restored] = await tx
      .update(matches)
      .set({ cancelledAt: null, cancelReason: null, cancelledBy: null })
      .where(and(eq(matches.id, matchId), isNotNull(matches.cancelledAt)))
      .returning();
    if (!restored) throw new DomainError('stale');
    await tx.insert(auditLog).values({ actorId, action: 'match_restored', targetId: matchId });
    return restored;
  });
}
