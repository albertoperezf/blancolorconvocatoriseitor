import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { attendances, auditLog } from '@/lib/db/schema';
import { attendanceStats, countAttendanceMatches } from '@/lib/match/attendance-stats';
import { cancelMatch, restoreMatch } from '@/lib/match/cancel';
import { ensureCurrentMatch, getCancelledMatch, type Match } from '@/lib/match/queries';
import { latestPlayedMatchId, listPlayedMatches, setMatchResult } from '@/lib/match/results';
import { notifyMatchStatus } from '@/lib/push/cancel-notice';
import { saveSubscription, type PushPayload, type PushSender } from '@/lib/push/service';
import { DomainError } from '@/lib/services/player';
import { cancelMatchSchema, restoreMatchSchema } from '@/lib/validators';
import { freshDb, insertUser } from './helpers/db';

// Thursday 22 Oct 2026, 20:30 Madrid (18:30 UTC); rollover 2 h later. The next one is on the 29th.
const TUESDAY = new Date('2026-10-20T09:00:00Z');
const AFTER_KICKOFF = new Date('2026-10-22T19:00:00Z');
const AFTER_ROLLOVER = new Date('2026-10-22T21:00:00Z');
const NEXT_KICKOFF = new Date('2026-10-29T19:30:00Z');

let h: DbHandle;
let match: Match;
const ids: Record<string, string> = {};

beforeAll(async () => {
  h = await freshDb();
  for (const [key, values] of Object.entries({
    admin: { role: 'admin' as const, displayName: 'Admin' },
    ana: {},
    absent: { longTermAbsence: true },
    inactive: { active: false },
  })) {
    ids[key] = (
      await insertUser(h, {
        username: key.toUpperCase(),
        team: 'blancos',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        ...values,
      })
    ).id;
  }
  match = await ensureCurrentMatch(h.db, TUESDAY);
  await h.db.insert(attendances).values([
    { matchId: match.id, userId: ids.admin, decision: 'going' },
    { matchId: match.id, userId: ids.ana, decision: 'going' },
  ]);
});
afterAll(() => h.close());

describe('cancelMatch', () => {
  it('refuses a match that is not the open one', async () => {
    const next = await ensureCurrentMatch(h.db, AFTER_ROLLOVER);
    await expect(cancelMatch(h.db, ids.admin, next.id, 'Mal tiempo', TUESDAY)).rejects.toEqual(
      new DomainError('stale'),
    );
  });

  it('calls the match off, opens the next one and keeps the answers', async () => {
    const cancelled = await cancelMatch(h.db, ids.admin, match.id, 'Mal tiempo', TUESDAY);
    expect(cancelled).toMatchObject({ id: match.id, cancelReason: 'Mal tiempo', cancelledBy: ids.admin });

    const open = await ensureCurrentMatch(h.db, TUESDAY);
    expect(open.startsAt).toEqual(new Date('2026-10-29T19:30:00Z'));
    expect(await getCancelledMatch(h.db, TUESDAY)).toMatchObject({ id: match.id, cancelledByName: 'Admin' });
    expect(await h.db.select().from(attendances).where(eq(attendances.matchId, match.id))).toHaveLength(2);
    const [log] = await h.db.select().from(auditLog).where(eq(auditLog.action, 'match_cancelled'));
    expect(log).toMatchObject({ actorId: ids.admin, targetId: match.id, details: 'Mal tiempo' });
  });

  it('refuses to cancel it twice', async () => {
    await expect(cancelMatch(h.db, ids.admin, match.id, 'Otra vez', TUESDAY)).rejects.toEqual(new DomainError('stale'));
  });

  it('stays announced until it would have rolled over', async () => {
    expect((await getCancelledMatch(h.db, AFTER_KICKOFF))?.id).toBe(match.id);
    expect(await getCancelledMatch(h.db, AFTER_ROLLOVER)).toBeUndefined();
  });

  it('is left out of attendance and results editing, but listed with its reason', async () => {
    expect(await countAttendanceMatches(h.db, NEXT_KICKOFF)).toBe(1);
    const [stats] = await attendanceStats(h.db, { userId: ids.ana, now: AFTER_ROLLOVER });
    expect(stats).toMatchObject({ went: 0, maybe: 0, missed: 0 });
    expect(await latestPlayedMatchId(h.db, AFTER_ROLLOVER)).toBeUndefined();
    await expect(setMatchResult(h.db, ids.admin, match.id, { blancos: 1, color: 0 }, AFTER_ROLLOVER)).rejects.toEqual(
      new DomainError('not_found'),
    );
    const [listed] = await listPlayedMatches(h.db, AFTER_ROLLOVER);
    expect(listed).toMatchObject({ id: match.id, cancelReason: 'Mal tiempo' });
  });
});

describe('restoreMatch', () => {
  it('refuses once the cancelled match has rolled over', async () => {
    await expect(restoreMatch(h.db, ids.admin, match.id, AFTER_ROLLOVER)).rejects.toEqual(new DomainError('stale'));
  });

  it('makes it this week’s match again, with its answers', async () => {
    const restored = await restoreMatch(h.db, ids.admin, match.id, TUESDAY);
    expect(restored).toMatchObject({ cancelledAt: null, cancelReason: null, cancelledBy: null });
    expect((await ensureCurrentMatch(h.db, TUESDAY)).id).toBe(match.id);
    expect(await getCancelledMatch(h.db, TUESDAY)).toBeUndefined();
    const [stats] = await attendanceStats(h.db, { userId: ids.ana, now: AFTER_ROLLOVER });
    expect(stats.went).toBe(1);
    const [log] = await h.db.select().from(auditLog).where(eq(auditLog.action, 'match_restored'));
    expect(log).toMatchObject({ actorId: ids.admin, targetId: match.id });
    await expect(restoreMatch(h.db, ids.admin, match.id, TUESDAY)).rejects.toEqual(new DomainError('stale'));
  });
});

describe('notifyMatchStatus', () => {
  it('tells every active player, long-term absences included, except the admin', async () => {
    for (const key of ['admin', 'ana', 'absent', 'inactive']) {
      await saveSubscription(h.db, ids[key], { endpoint: `https://push.example/${key}`, p256dh: 'p', auth: 'a' });
    }
    const calls: { endpoint: string; payload: PushPayload }[] = [];
    const send: PushSender = async (sub, payload) => {
      calls.push({ endpoint: sub.endpoint, payload });
      return 'ok';
    };
    const text = { title: 'Partido cancelado', body: 'Motivo: Mal tiempo' };

    expect(await notifyMatchStatus(h.db, match, ids.admin, send, text)).toEqual({ sent: 2, failed: 0, removed: 0 });
    expect(calls.map((c) => c.endpoint).sort()).toEqual(['https://push.example/absent', 'https://push.example/ana']);
    // No answer buttons on a cancellation, so no matchId for the service worker either.
    expect(calls[0].payload).toEqual({ ...text, url: '/partido', tag: `reminder-${match.id}` });

    calls.length = 0;
    const actions = [{ action: 'going' as const, title: 'Voy' }];
    await notifyMatchStatus(h.db, match, ids.admin, send, { ...text, actions });
    expect(calls[0].payload).toMatchObject({ actions, matchId: match.id });
  });
});

describe('cancel and restore schemas', () => {
  const matchId = '00000000-0000-4000-8000-000000000000';
  it('need CANCELAR and a reason; "other" needs the admin’s own words', () => {
    expect(cancelMatchSchema.safeParse({ matchId, confirm: ' cancelar ', reason: 'weather' }).success).toBe(true);
    expect(cancelMatchSchema.safeParse({ matchId, confirm: 'CANCELAR', reason: '' }).error?.issues[0]).toMatchObject({
      path: ['reason'],
      message: 'cancel.reason',
    });
    expect(
      cancelMatchSchema.safeParse({ matchId, confirm: 'CANCELAR', reason: 'other', note: ' x ' }).error?.issues[0],
    ).toMatchObject({ path: ['note'], message: 'cancel.note' });
    expect(
      cancelMatchSchema.safeParse({ matchId, confirm: 'CANCELAR', reason: 'other', note: 'Final de Copa' }).success,
    ).toBe(true);
    expect(
      cancelMatchSchema.safeParse({ matchId, confirm: 'CANCELAR', reason: 'other', note: 'x'.repeat(101) }).success,
    ).toBe(false);
    expect(cancelMatchSchema.safeParse({ matchId, confirm: 'REINICIAR', reason: 'weather' }).success).toBe(false);
    expect(restoreMatchSchema.safeParse({ matchId, confirm: 'reactivar' }).success).toBe(true);
    expect(restoreMatchSchema.safeParse({ matchId, confirm: 'CANCELAR' }).success).toBe(false);
  });
});

describe('cancel texts', () => {
  it('read naturally', async () => {
    const { createTranslator } = await import('next-intl');
    const messages = (await import('../../messages/es.json')).default;
    const push = createTranslator({ locale: 'es', messages, namespace: 'push' });
    expect(push('cancelBody', { day: 'Jueves, 22 de octubre', time: '20:30', reason: 'Mal tiempo' })).toBe(
      'Jueves, 22 de octubre · 20:30 — No hay partido. Motivo: Mal tiempo',
    );
    const match = createTranslator({ locale: 'es', messages, namespace: 'match' });
    expect(
      match('cancelledShareText', {
        day: 'jueves, 22 de octubre',
        time: '20:30',
        reason: 'Mal tiempo',
        url: 'https://x',
      }),
    ).toBe('❌ Partido Blancolores cancelado\n📅 jueves, 22 de octubre a las 20:30\nMotivo: Mal tiempo\nhttps://x');
  });
});
