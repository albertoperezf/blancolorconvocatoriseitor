import { TZDate } from '@date-fns/tz';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { attendances, reminderSends, users } from '@/lib/db/schema';
import { ensureCurrentMatch, getSettings, getSquad, type Match } from '@/lib/match/queries';
import { goingCount } from '@/lib/match/squad';
import { sendToSubscriptions, subscriptionsFor, type PushPayload, type PushSender } from './service';

export type ReminderKind = 'monday' | 'wednesday';
export type ReminderCounts = { answered: number; going: number };
export type ComposeReminder = (match: Match, counts: ReminderCounts) => Promise<Pick<PushPayload, 'title' | 'body'>>;

const DAY_MS = 86_400_000;
// Monday 10:00 → Thursday 20:30 is ~3.4 days; anything further away is not "this week's" match.
const MAX_LEAD_MS = 4 * DAY_MS;

export function reminderKindFor(now: Date, timezone: string): ReminderKind | null {
  const weekday = new TZDate(now.getTime(), timezone).getDay();
  return weekday === 1 ? 'monday' : weekday === 3 ? 'wednesday' : null;
}

/** Active players who haven't answered this match yet, excluding long-term absences. */
export async function pendingPlayerIds(db: Db, matchId: string): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .leftJoin(attendances, and(eq(attendances.userId, users.id), eq(attendances.matchId, matchId)))
    .where(and(eq(users.active, true), eq(users.longTermAbsence, false), isNull(attendances.userId)));
  return rows.map((r) => r.id);
}

export async function reminderCounts(db: Db, matchId: string): Promise<ReminderCounts> {
  const [[row], squad] = await Promise.all([
    db.select({ n: count() }).from(attendances).where(eq(attendances.matchId, matchId)),
    getSquad(db, matchId),
  ]);
  return { answered: row.n, going: goingCount(squad) };
}

export async function reminderPayload(db: Db, match: Match, compose: ComposeReminder): Promise<PushPayload> {
  const text = await compose(match, await reminderCounts(db, match.id));
  return { ...text, url: '/partido', tag: `reminder-${match.id}` };
}

/** Called by the cron job: on Mondays and Wednesdays, nudges players who haven't answered yet (once per day kind). */
export async function runReminder(
  db: Db,
  { now, send, compose }: { now: Date; send: PushSender; compose: ComposeReminder },
) {
  const settings = await getSettings(db);
  const kind = reminderKindFor(now, settings.timezone);
  if (!kind) return { skipped: 'not-a-reminder-day' as const };

  const match = await ensureCurrentMatch(db, now);
  const lead = match.startsAt.getTime() - now.getTime();
  if (lead <= 0 || lead > MAX_LEAD_MS) return { skipped: 'no-match-this-week' as const, kind };

  const claimed = await db
    .insert(reminderSends)
    .values({ matchId: match.id, kind })
    .onConflictDoNothing()
    .returning({ kind: reminderSends.kind });
  if (claimed.length === 0) return { skipped: 'already-sent' as const, kind };

  const subs = await subscriptionsFor(db, await pendingPlayerIds(db, match.id));
  const payload = await reminderPayload(db, match, compose);
  return { kind, ...(await sendToSubscriptions(db, subs, payload, send)) };
}
