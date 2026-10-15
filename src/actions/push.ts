'use server';

import { z } from 'zod';
import { requireAdmin, requireUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getSettings } from '@/lib/match/queries';
import { composeReminder } from '@/lib/push/reminder-text';
import { reminderPayload } from '@/lib/push/reminders';
import {
  deleteSubscription,
  pushConfigured,
  saveSubscription,
  sendToSubscriptions,
  subscriptionsFor,
  webPushSender,
} from '@/lib/push/service';

const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscriptionAction(subscription: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  await saveSubscription(await getDb(), user.id, { endpoint, ...keys });
  return { ok: true };
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<void> {
  const user = await requireUser();
  await deleteSubscription(await getDb(), user.id, String(endpoint));
}

/** Sends this week's reminder to the admin's own devices only, to check how it looks. */
export async function sendTestPushAction(): Promise<{ status: 'sent' | 'no-devices' | 'not-configured' | 'failed' }> {
  const admin = await requireAdmin();
  if (!pushConfigured()) return { status: 'not-configured' };
  const db = await getDb();
  const subs = await subscriptionsFor(db, [admin.id]);
  if (subs.length === 0) return { status: 'no-devices' };
  const [settings, match] = await Promise.all([getSettings(db), ensureCurrentMatch(db)]);
  const payload = await reminderPayload(db, match, composeReminder(settings.timezone));
  const { sent } = await sendToSubscriptions(db, subs, { ...payload, tag: 'test' }, webPushSender());
  return { status: sent > 0 ? 'sent' : 'failed' };
}
