import { and, eq, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import type { Db } from '@/lib/db/create';
import { pushSubscriptions } from '@/lib/db/schema';

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };
/** Resolves to 'gone' when the push service says the subscription no longer exists. */
export type PushSender = (sub: StoredSubscription, payload: PushPayload) => Promise<'ok' | 'gone'>;

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function webPushSender(): PushSender {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return async (sub, payload) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 12 * 3600 },
      );
      return 'ok';
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return 'gone';
      throw e;
    }
  };
}

export async function saveSubscription(db: Db, userId: string, sub: StoredSubscription) {
  await db
    .insert(pushSubscriptions)
    .values({ ...sub, userId })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: sub.p256dh, auth: sub.auth } });
}

export async function deleteSubscription(db: Db, userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
}

export function subscriptionsFor(db: Db, userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve([]);
  return db
    .select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
}

/** Sends to every subscription, dropping the ones the push service reports as gone. */
export async function sendToSubscriptions(db: Db, subs: StoredSubscription[], payload: PushPayload, send: PushSender) {
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        if ((await send(sub, payload)) === 'gone') gone.push(sub.endpoint);
        else sent++;
      } catch {
        failed++;
      }
    }),
  );
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, gone));
  return { sent, failed, removed: gone.length };
}
