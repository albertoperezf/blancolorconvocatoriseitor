import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { attendances, guests, matches, users } from '@/lib/db/schema';
import {
  buildScorerColumns,
  listMatchScorers,
  playerGoals,
  rankScorers,
  saveMatchResult,
  scorerCandidates,
  scorerExcess,
  topScorers,
} from '@/lib/match/goals';
import { parseScorers } from '@/lib/validators';
import { freshDb, insertUser } from './helpers/db';

let h: DbHandle;
let adminId: string;
let blanco: typeof users.$inferSelect;
let color: typeof users.$inferSelect;
let noTeam: typeof users.$inferSelect;
let first: string;
let second: string;
let early: string;
let guestId: string;
const now = new Date('2026-10-30T12:00:00Z');

beforeAll(async () => {
  h = await freshDb();
  adminId = (await insertUser(h, { username: 'ADMIN', role: 'admin', team: 'color' })).id;
  blanco = await insertUser(h, { username: 'BLANCO', team: 'blancos' });
  color = await insertUser(h, { username: 'COLOR', team: 'color' });
  noTeam = await insertUser(h, { username: 'SINEQUIPO' });
  const rows = await h.db
    .insert(matches)
    .values([
      { startsAt: new Date('2026-10-08T18:30:00Z'), venue: 'X' }, // before results start
      { startsAt: new Date('2026-10-15T18:30:00Z'), venue: 'X' },
      { startsAt: new Date('2026-10-22T18:30:00Z'), venue: 'X' },
    ])
    .returning({ id: matches.id });
  [early, first, second] = rows.map((r) => r.id);
  await h.db.insert(attendances).values([
    { matchId: first, userId: blanco.id, decision: 'going' },
    { matchId: first, userId: color.id, decision: 'going' },
    { matchId: first, userId: noTeam.id, decision: 'going' },
    { matchId: first, userId: adminId, decision: 'maybe' },
  ]);
  [{ id: guestId }] = await h.db
    .insert(guests)
    .values({ matchId: first, hostId: blanco.id, name: 'Pepe' })
    .returning({ id: guests.id });
});
afterAll(() => h.close());

describe('scorerExcess', () => {
  it('flags only teams with more assigned goals than the score', () => {
    const s = (team: 'blancos' | 'color', goals: number) => ({ team, kind: 'user' as const, id: 'x', goals });
    expect(scorerExcess({ blancos: 2, color: 1 }, [s('blancos', 1), s('blancos', 1), s('color', 1)])).toEqual([]);
    expect(scorerExcess({ blancos: 2, color: 0 }, [s('blancos', 3), s('color', 1)])).toEqual(['blancos', 'color']);
  });
});

describe('rankScorers', () => {
  it('shares ranks on ties and keeps everyone tied inside the limit', () => {
    const rows = [5, 3, 3, 2, 2, 2, 1].map((goals, i) => ({ id: i, goals }));
    expect(rankScorers(rows, 4).map((r) => r.rank)).toEqual([1, 2, 2, 4, 4, 4]);
  });
});

describe('parseScorers', () => {
  it('accepts the editor payload and rejects anything malformed', () => {
    const ok = [{ team: 'blancos', kind: 'user', id: '0b6d4c1e-9f1a-4a8e-8a51-2d7c1b8f0a11', goals: 2 }];
    expect(parseScorers(JSON.stringify(ok))).toEqual(ok);
    expect(parseScorers('[]')).toEqual([]);
    expect(parseScorers('not json')).toBeNull();
    expect(parseScorers(JSON.stringify([{ ...ok[0], goals: 0 }]))).toBeNull();
    expect(parseScorers(null)).toBeNull();
  });
});

describe('scorer candidates', () => {
  it('lists VOY players per team (no-team in both), the match guests, and offers everyone else', async () => {
    const candidates = await scorerCandidates(h.db, [first]);
    const cols = buildScorerColumns(first, candidates, []);
    expect(cols.blancos.listed.map((s) => s.name)).toEqual(['BLANCO', 'Pepe', 'SINEQUIPO']);
    expect(cols.color.listed.map((s) => s.name)).toEqual(['COLOR', 'Pepe', 'SINEQUIPO']);
    expect(cols.blancos.listed.find((s) => s.name === 'Pepe')?.kind).toBe('guest');
    expect(cols.blancos.extra.map((o) => o.name)).toEqual(['ADMIN', 'COLOR']);
  });
});

describe('saveMatchResult', () => {
  it('saves the score with scorers (players and guests) and replaces them on correction', async () => {
    await saveMatchResult(
      h.db,
      adminId,
      first,
      { blancos: 3, color: 1 },
      [
        { team: 'blancos', kind: 'user', id: blanco.id, goals: 2 },
        { team: 'blancos', kind: 'guest', id: guestId, goals: 1 },
        { team: 'color', kind: 'user', id: adminId, goals: 1 },
      ],
      now,
    );
    let scorers = await listMatchScorers(h.db, [first]);
    expect(scorers.map((s) => [s.team, s.name, s.goals])).toEqual([
      ['blancos', 'BLANCO', 2],
      ['color', 'ADMIN', 1],
      ['blancos', 'Pepe', 1],
    ]);

    // Fewer scorers than goals is fine: the rest stay unassigned.
    await saveMatchResult(
      h.db,
      adminId,
      first,
      { blancos: 3, color: 1 },
      [{ team: 'blancos', kind: 'user', id: blanco.id, goals: 1 }],
      now,
    );
    scorers = await listMatchScorers(h.db, [first]);
    expect(scorers.map((s) => [s.name, s.goals])).toEqual([['BLANCO', 1]]);

    const cols = buildScorerColumns(first, await scorerCandidates(h.db, [first]), scorers);
    expect(cols.blancos.listed.find((s) => s.name === 'BLANCO')?.goals).toBe(1);
  });

  it('rejects more scorers than goals, duplicates, and guests from another match, saving nothing', async () => {
    const before = await h.db.select().from(matches).where(eq(matches.id, second));
    const score = { blancos: 1, color: 0 };
    await expect(
      saveMatchResult(h.db, adminId, second, score, [{ team: 'color', kind: 'user', id: color.id, goals: 1 }], now),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const dup = { team: 'blancos' as const, kind: 'user' as const, id: blanco.id, goals: 1 };
    await expect(
      saveMatchResult(h.db, adminId, second, { blancos: 2, color: 0 }, [dup, dup], now),
    ).rejects.toMatchObject({ code: 'duplicate' });
    await expect(
      saveMatchResult(h.db, adminId, second, score, [{ team: 'blancos', kind: 'guest', id: guestId, goals: 1 }], now),
    ).rejects.toMatchObject({ code: 'not_found' });
    // The transaction rolled back the score too.
    expect(await h.db.select().from(matches).where(eq(matches.id, second))).toEqual(before);
    expect(await listMatchScorers(h.db, [second])).toEqual([]);
  });

  it('refuses matches before results started', async () => {
    await expect(saveMatchResult(h.db, adminId, early, { blancos: 0, color: 0 }, [], now)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('Pichichi and player goals', () => {
  it('sums goals across matches for registered players only, ranked with ties', async () => {
    await saveMatchResult(
      h.db,
      adminId,
      first,
      { blancos: 3, color: 2 },
      [
        { team: 'blancos', kind: 'user', id: blanco.id, goals: 2 },
        { team: 'blancos', kind: 'guest', id: guestId, goals: 1 },
        { team: 'color', kind: 'user', id: color.id, goals: 2 },
      ],
      now,
    );
    await saveMatchResult(
      h.db,
      adminId,
      second,
      { blancos: 1, color: 1 },
      [
        { team: 'blancos', kind: 'user', id: blanco.id, goals: 1 },
        { team: 'color', kind: 'user', id: adminId, goals: 1 },
      ],
      now,
    );
    expect((await topScorers(h.db)).map((s) => [s.rank, s.name, s.goals])).toEqual([
      [1, 'BLANCO', 3],
      [2, 'COLOR', 2],
      [3, 'ADMIN', 1],
    ]);
    expect(await playerGoals(h.db, blanco.id)).toBe(3);
    expect(await playerGoals(h.db, noTeam.id)).toBe(0);
  });
});
