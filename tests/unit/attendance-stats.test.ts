import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { attendances, guests, matches } from '@/lib/db/schema';
import { attendanceStats, countAttendanceMatches } from '@/lib/match/attendance-stats';
import { freshDb, insertUser } from './helpers/db';

let h: DbHandle;
const ids: Record<string, string> = {};
const now = new Date('2026-11-10T12:00:00Z');
const joined = new Date('2026-10-01T00:00:00Z');

beforeAll(async () => {
  h = await freshDb();
  const m = await h.db
    .insert(matches)
    .values([
      { startsAt: new Date('2026-10-15T18:30:00Z'), venue: 'X' }, // before attendance starts
      { startsAt: new Date('2026-10-22T18:30:00Z'), venue: 'X' },
      { startsAt: new Date('2026-10-29T19:30:00Z'), venue: 'X' },
      { startsAt: new Date('2026-11-05T19:30:00Z'), venue: 'X' },
      { startsAt: new Date('2026-11-12T19:30:00Z'), venue: 'X' }, // not played yet
    ])
    .returning({ id: matches.id });
  const [before, m1, m2, m3, future] = m.map((r) => r.id);

  for (const [key, values] of Object.entries({
    answered: { createdAt: joined },
    silent: { createdAt: joined, longTermAbsence: true },
    absentButGoing: { createdAt: joined, longTermAbsence: true },
    lateJoiner: { createdAt: new Date('2026-11-01T00:00:00Z') },
    inactive: { createdAt: joined, active: false },
  })) {
    ids[key] = (await insertUser(h, { username: key.toUpperCase(), ...values })).id;
  }

  await h.db.insert(attendances).values([
    { matchId: before, userId: ids.answered, decision: 'going' },
    { matchId: m1, userId: ids.answered, decision: 'going' },
    { matchId: m2, userId: ids.answered, decision: 'maybe' },
    { matchId: m3, userId: ids.answered, decision: 'not_going' },
    { matchId: future, userId: ids.answered, decision: 'going' },
    { matchId: m1, userId: ids.absentButGoing, decision: 'going' },
    { matchId: m2, userId: ids.absentButGoing, decision: 'going' },
    { matchId: m3, userId: ids.absentButGoing, decision: 'going' },
    { matchId: m3, userId: ids.lateJoiner, decision: 'going' },
    { matchId: m1, userId: ids.inactive, decision: 'going' },
  ]);
  await h.db.insert(guests).values({ matchId: m1, hostId: ids.answered, name: 'Invitado' });
});
afterAll(() => h.close());

describe('attendanceStats', () => {
  it('counts VOY as went, DUDA as maybe and NO VOY, no answer or long-term absence as missed', async () => {
    const stats = Object.fromEntries(
      (await attendanceStats(h.db, { now })).map((s) => [s.userId, [s.went, s.maybe, s.missed]]),
    );
    expect(stats).toEqual({
      [ids.answered]: [1, 1, 1],
      [ids.silent]: [0, 0, 3],
      [ids.absentButGoing]: [3, 0, 0],
      [ids.lateJoiner]: [1, 0, 0],
    });
  });

  it('returns a single player when asked', async () => {
    const [mine, ...rest] = await attendanceStats(h.db, { userId: ids.answered, now });
    expect(rest).toHaveLength(0);
    expect(mine).toMatchObject({ displayName: 'ANSWERED', went: 1, maybe: 1, missed: 1 });
  });
});

describe('countAttendanceMatches', () => {
  it('counts only matches played since attendance started', async () => {
    expect(await countAttendanceMatches(h.db, now)).toBe(3);
  });
});
