import { timingSafeEqual } from 'node:crypto';
import { purgeExpiredSessions } from '@/lib/auth/sessions';
import { getDb } from '@/lib/db';
import { getSettings } from '@/lib/match/queries';
import { composeReminder } from '@/lib/push/reminder-text';
import { runReminder } from '@/lib/push/reminders';
import { pushConfigured, webPushSender } from '@/lib/push/service';

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` (see vercel.json).
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
  const db = await getDb();
  // Housekeeping: sessions nobody came back to; used ones are already checked and dropped on use.
  const purgedSessions = await purgeExpiredSessions(db);
  if (!pushConfigured()) return Response.json({ purgedSessions, skipped: 'push-not-configured' });
  const { timezone } = await getSettings(db);
  const result = await runReminder(db, { now: new Date(), send: webPushSender(), compose: composeReminder(timezone) });
  return Response.json({ purgedSessions, ...result });
}
