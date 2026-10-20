import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { ensureCurrentMatch } from '@/lib/match/queries';
import { canEditMatch, latestPlayedMatchId } from '@/lib/match/results';
import { nextMatchStart, type Schedule } from '@/lib/match/schedule';
import { freshDb } from './helpers/db';

const THURSDAY_2030: Schedule = { weekday: 4, kickoffTime: '20:30', timezone: 'Europe/Madrid', rolloverHours: 2 };

describe('nextMatchStart', () => {
  it('is the following kick-off, also across the switch to winter time', () => {
    expect(nextMatchStart(new Date('2026-10-15T18:30:00Z'), THURSDAY_2030).toISOString()).toBe(
      '2026-10-22T18:30:00.000Z',
    );
    expect(nextMatchStart(new Date('2026-10-22T18:30:00Z'), THURSDAY_2030).toISOString()).toBe(
      '2026-10-29T19:30:00.000Z',
    );
  });
});

describe('which match can be edited', () => {
  let h: DbHandle;
  let first: string;
  beforeAll(async () => {
    h = await freshDb();
    first = (await ensureCurrentMatch(h.db, new Date('2026-10-12T09:00:00Z'))).id; // Thursday 15 Oct
  });
  afterAll(() => h.close());

  it('is the 15 Oct match for the whole week, until the next one kicks off', async () => {
    expect(await latestPlayedMatchId(h.db, new Date('2026-10-15T18:30:00Z'))).toBe(first);
    expect(await latestPlayedMatchId(h.db, new Date('2026-10-22T18:29:00Z'))).toBe(first);
  });

  it('moves to the 22 Oct match on its kick-off, even if nobody opened the app that week', async () => {
    const h2 = await freshDb();
    await ensureCurrentMatch(h2.db, new Date('2026-10-12T09:00:00Z'));
    const latest = await latestPlayedMatchId(h2.db, new Date('2026-10-22T18:30:00Z'));
    const created = await ensureCurrentMatch(h2.db, new Date('2026-10-22T18:30:00Z'));
    expect(latest).toBe(created.id);
    expect(created.startsAt.toISOString()).toBe('2026-10-22T18:30:00.000Z');
    await h2.close();
  });

  it('lets editors edit only the latest match, and admins any', () => {
    expect(canEditMatch('editor', 'latest', 'latest')).toBe(true);
    expect(canEditMatch('editor', 'older', 'latest')).toBe(false);
    expect(canEditMatch('admin', 'older', 'latest')).toBe(true);
    expect(canEditMatch('editor', 'any', undefined)).toBe(false);
  });
});
