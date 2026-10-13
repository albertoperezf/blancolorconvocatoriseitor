import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { matches } from '@/lib/db/schema';
import { listPlayedMatches, matchWinner, seasonSummary, setMatchResult } from '@/lib/match/results';
import { freshDb, insertUser } from './helpers/db';

let h: DbHandle;
let adminId: string;
const now = new Date('2026-10-30T12:00:00Z');

beforeAll(async () => {
  h = await freshDb();
  adminId = (await insertUser(h, { username: 'ADMIN', role: 'admin' })).id;
  await h.db.insert(matches).values([
    { startsAt: new Date('2026-10-08T18:30:00Z'), venue: 'X' }, // before results start
    { startsAt: new Date('2026-10-15T18:30:00Z'), venue: 'X' },
    { startsAt: new Date('2026-10-22T18:30:00Z'), venue: 'X' },
    { startsAt: new Date('2026-11-05T19:30:00Z'), venue: 'X' }, // not played yet
  ]);
});
afterAll(() => h.close());

describe('matchWinner', () => {
  it('derives Blancos, Color or a draw from the goals', () => {
    expect(matchWinner(3, 1)).toBe('blancos');
    expect(matchWinner(0, 2)).toBe('color');
    expect(matchWinner(4, 4)).toBe('draw');
  });
});

describe('seasonSummary', () => {
  it('counts wins per team and draws, skipping matches without a result', () => {
    const g = (blancosGoals: number | null, colorGoals: number | null) => ({ blancosGoals, colorGoals });
    expect(seasonSummary([g(3, 1), g(0, 2), g(1, 1), g(2, 0), g(null, null)])).toEqual({
      blancos: 2,
      color: 1,
      draw: 1,
      total: 4,
    });
    expect(seasonSummary([]).total).toBe(0);
  });
});

describe('results', () => {
  it('lists played matches since 15 October, newest first', async () => {
    const played = await listPlayedMatches(h.db, now);
    expect(played.map((m) => m.startsAt.toISOString())).toEqual([
      '2026-10-22T18:30:00.000Z',
      '2026-10-15T18:30:00.000Z',
    ]);
    expect(played[0].blancosGoals).toBeNull();
  });

  it('saves and later corrects a result', async () => {
    const [latest] = await listPlayedMatches(h.db, now);
    await setMatchResult(h.db, adminId, latest.id, { blancos: 5, color: 3 }, now);
    await setMatchResult(h.db, adminId, latest.id, { blancos: 5, color: 5 }, now);
    const [updated] = await listPlayedMatches(h.db, now);
    expect(updated).toMatchObject({ blancosGoals: 5, colorGoals: 5 });
  });

  it('refuses results for matches not yet played or before results started', async () => {
    const all = await h.db.select().from(matches);
    for (const m of all.filter((x) => x.startsAt < new Date('2026-10-15') || x.startsAt > now)) {
      await expect(setMatchResult(h.db, adminId, m.id, { blancos: 1, color: 0 }, now)).rejects.toMatchObject({
        code: 'not_found',
      });
    }
  });
});
