import { and, eq, ne } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { users } from '@/lib/db/schema';
import type { Match } from '@/lib/match/queries';
import { sendToSubscriptions, subscriptionsFor, type PushPayload, type PushSender } from './service';

/**
 * Tells every active player (long-term absences too, but not the admin who did it) that the match was called off
 * or is back on. Same tag as the reminders, so it replaces one still on screen.
 */
export async function notifyMatchStatus(
  db: Db,
  match: Match,
  actorId: string,
  send: PushSender,
  text: Pick<PushPayload, 'title' | 'body' | 'actions' | 'confirm'>,
) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.active, true), ne(users.id, actorId)));
  const subs = await subscriptionsFor(
    db,
    rows.map((r) => r.id),
  );
  if (subs.length === 0) return { sent: 0, failed: 0, removed: 0 };
  // Answer buttons only make sense when the match is back on.
  const payload = { ...text, url: '/partido', tag: `reminder-${match.id}`, ...(text.actions && { matchId: match.id }) };
  return sendToSubscriptions(db, subs, payload, send);
}
