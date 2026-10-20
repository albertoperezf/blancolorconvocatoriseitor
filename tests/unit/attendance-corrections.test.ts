import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { attendances, auditLog, guests, matchGoals } from '@/lib/db/schema';
import { saveMatchResult } from '@/lib/match/goals';
import { ensureCurrentMatch, type Match } from '@/lib/match/queries';
import { DomainError } from '@/lib/services/player';
import { parseAttendanceChanges } from '@/lib/validators';
import { freshDb, insertUser } from './helpers/db';

const NOW = new Date('2026-10-19T09:00:00Z');

let h: DbHandle;
let match: Match;
const ids: Record<string, string> = {};
let guestOk: string;
let guestMistake: string;

const decisionOf = async (userId: string) =>
  (
    await h.db
      .select({ d: attendances.decision })
      .from(attendances)
      .where(and(eq(attendances.matchId, match.id), eq(attendances.userId, userId)))
  )[0]?.d ?? null;

beforeAll(async () => {
  h = await freshDb();
  for (const [key, values] of Object.entries({
    editor: { role: 'editor' as const },
    noShow: {},
    scorer: {},
    maybe: {},
    gone: { active: false },
  })) {
    ids[key] = (await insertUser(h, { username: key.toUpperCase(), team: 'blancos', ...values })).id;
  }
  match = await ensureCurrentMatch(h.db, new Date('2026-10-13T10:00:00Z')); // played Thursday 15 Oct
  await h.db.insert(attendances).values([
    { matchId: match.id, userId: ids.noShow, decision: 'going' },
    { matchId: match.id, userId: ids.scorer, decision: 'going' },
    { matchId: match.id, userId: ids.maybe, decision: 'maybe' },
  ]);
  [{ id: guestOk }, { id: guestMistake }] = await h.db
    .insert(guests)
    .values([
      { matchId: match.id, hostId: ids.scorer, name: 'Bueno' },
      { matchId: match.id, hostId: ids.scorer, name: 'Por error' },
    ])
    .returning({ id: guests.id });
  await saveMatchResult(
    h.db,
    ids.editor,
    match.id,
    { blancos: 3, color: 0 },
    [
      { team: 'blancos', kind: 'user', id: ids.scorer, goals: 1 },
      { team: 'blancos', kind: 'guest', id: guestMistake, goals: 2 },
    ],
    NOW,
  );
});
afterAll(() => h.close());

describe('correcting who came', () => {
  it('refuses goals for someone marked as not there', async () => {
    await expect(
      saveMatchResult(
        h.db,
        ids.editor,
        match.id,
        { blancos: 1, color: 0 },
        [{ team: 'blancos', kind: 'user', id: ids.noShow, goals: 1 }],
        NOW,
        { absent: [ids.noShow], present: [], removeGuests: [] },
      ),
    ).rejects.toEqual(new DomainError('forbidden'));
  });

  it('changes nothing if one of the players added is not an active account', async () => {
    await expect(
      saveMatchResult(h.db, ids.editor, match.id, { blancos: 1, color: 0 }, [], NOW, {
        absent: [ids.noShow],
        present: [ids.gone],
        removeGuests: [],
      }),
    ).rejects.toEqual(new DomainError('not_found'));
    expect(await decisionOf(ids.noShow)).toBe('going');
  });

  it('marks no-shows as NO VOY, adds who came, and deletes mistaken guests with their goals', async () => {
    await saveMatchResult(
      h.db,
      ids.editor,
      match.id,
      { blancos: 1, color: 0 },
      [{ team: 'blancos', kind: 'user', id: ids.scorer, goals: 1 }],
      NOW,
      { absent: [ids.noShow], present: [ids.maybe], removeGuests: [guestMistake] },
    );

    expect(await decisionOf(ids.noShow)).toBe('not_going');
    expect(await decisionOf(ids.maybe)).toBe('going');
    expect(await decisionOf(ids.scorer)).toBe('going');
    const left = await h.db.select({ id: guests.id }).from(guests).where(eq(guests.matchId, match.id));
    expect(left.map((g) => g.id)).toEqual([guestOk]);
    expect(await h.db.select().from(matchGoals).where(eq(matchGoals.guestId, guestMistake))).toHaveLength(0);
    const [log] = await h.db.select().from(auditLog).where(eq(auditLog.action, 'attendance_corrected'));
    expect(log).toMatchObject({ actorId: ids.editor, targetId: match.id });
  });
});

describe('parseAttendanceChanges', () => {
  it('treats a missing field as no changes and rejects malformed input', () => {
    expect(parseAttendanceChanges(null)).toEqual({ absent: [], present: [], removeGuests: [] });
    expect(parseAttendanceChanges('nope')).toBeNull();
    expect(parseAttendanceChanges(JSON.stringify({ absent: ['x'], present: [], removeGuests: [] }))).toBeNull();
  });
});
