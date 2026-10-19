import type { Db } from '@/lib/db/create';
import type { Match } from '@/lib/match/queries';
import { pendingPlayerIds } from './reminders';
import { sendToSubscriptions, subscriptionsFor, type PushPayload, type PushSender } from './service';

/** After a reset, asks every active player (except the admin who did it) to answer again. */
export async function notifyMatchReset(
  db: Db,
  match: Match,
  actorId: string,
  send: PushSender,
  text: Pick<PushPayload, 'title' | 'body' | 'actions' | 'confirm'>,
) {
  const ids = (await pendingPlayerIds(db, match.id)).filter((id) => id !== actorId);
  const subs = await subscriptionsFor(db, ids);
  if (subs.length === 0) return { sent: 0, failed: 0, removed: 0 };
  // Same tag as the reminders, so it replaces a reminder still on screen with outdated counts.
  const payload = { ...text, url: '/partido', tag: `reminder-${match.id}`, matchId: match.id };
  return sendToSubscriptions(db, subs, payload, send);
}
