import type { Db } from '@/lib/db/create';
import { sendToSubscriptions, subscriptionsFor, type PushPayload, type PushSender } from './service';

/** Tells a player on their own devices that they can now enter results (sent when promoted to Editor). */
export async function notifyNewEditor(
  db: Db,
  userId: string,
  send: PushSender,
  text: Pick<PushPayload, 'title' | 'body'>,
) {
  const subs = await subscriptionsFor(db, [userId]);
  if (subs.length === 0) return { sent: 0 };
  return sendToSubscriptions(db, subs, { ...text, url: '/resultados', tag: 'role-editor' }, send);
}
