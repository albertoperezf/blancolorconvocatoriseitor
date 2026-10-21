import { and, asc, count, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { attendances, matches, users } from '@/lib/db/schema';

/** First match counted for attendance; ATTENDANCE_FROM (ISO date) can move it for local testing. */
export function attendanceFrom(): Date {
  return new Date(process.env.ATTENDANCE_FROM ?? '2026-10-22T00:00:00+02:00');
}

export type AttendanceStats = {
  userId: string;
  displayName: string;
  team: 'blancos' | 'color' | null;
  longTermAbsence: boolean;
  went: number;
  maybe: number;
  missed: number;
};

/**
 * Per active player, over the matches already kicked off since attendanceFrom() and after they joined:
 * went = answered VOY, maybe = DUDA, missed = NO VOY or no answer (undecided and long-term absent).
 */
export async function attendanceStats(
  db: Db,
  { userId, now = new Date() }: { userId?: string; now?: Date } = {},
): Promise<AttendanceStats[]> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      team: users.team,
      longTermAbsence: users.longTermAbsence,
      total: sql<number>`count(${matches.id})::int`,
      went: sql<number>`count(*) filter (where ${attendances.decision} = 'going')::int`,
      maybe: sql<number>`count(*) filter (where ${attendances.decision} = 'maybe')::int`,
    })
    .from(users)
    .leftJoin(
      matches,
      and(
        gte(matches.startsAt, attendanceFrom()),
        lte(matches.startsAt, now),
        gte(matches.startsAt, users.createdAt),
        isNull(matches.cancelledAt),
      ),
    )
    .leftJoin(attendances, and(eq(attendances.matchId, matches.id), eq(attendances.userId, users.id)))
    .where(userId ? and(eq(users.active, true), eq(users.id, userId)) : eq(users.active, true))
    .groupBy(users.id)
    .orderBy(asc(users.displayName));

  return rows.map(({ total, ...r }) => ({ ...r, missed: total - r.went - r.maybe }));
}

export async function countAttendanceMatches(db: Db, now: Date = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(matches)
    .where(and(gte(matches.startsAt, attendanceFrom()), lte(matches.startsAt, now), isNull(matches.cancelledAt)));
  return row.n;
}
