import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { attendances, auditLog, guests } from '@/lib/db/schema';
import { ensureCurrentMatch, type Match } from '@/lib/match/queries';
import { resetMatch, resetSummary } from '@/lib/match/reset';
import { notifyMatchReset } from '@/lib/push/reset-notice';
import { saveSubscription, type PushPayload, type PushSender } from '@/lib/push/service';
import { DomainError } from '@/lib/services/player';
import { resetMatchSchema } from '@/lib/validators';
import { freshDb, insertUser } from './helpers/db';

// Thursday 22 Oct 2026, 20:30 Madrid (18:30 UTC); rollover 2 h later.
const MONDAY = new Date('2026-10-19T09:00:00Z');
const KICKED_OFF = new Date('2026-10-22T19:00:00Z');
const NEXT_WEEK = new Date('2026-10-23T09:00:00Z');

let h: DbHandle;
let match: Match;
const ids: Record<string, string> = {};

async function fill() {
  await h.db.insert(attendances).values([
    { matchId: match.id, userId: ids.admin, decision: 'going' },
    { matchId: match.id, userId: ids.ana, decision: 'going' },
    { matchId: match.id, userId: ids.luis, decision: 'maybe' },
    { matchId: match.id, userId: ids.pepe, decision: 'not_going' },
  ]);
  await h.db.insert(guests).values([
    { matchId: match.id, hostId: ids.ana, name: 'Invitado Uno' },
    { matchId: match.id, hostId: ids.ana, name: 'Invitado Dos' },
  ]);
}

beforeAll(async () => {
  h = await freshDb();
  for (const [key, values] of Object.entries({
    admin: { role: 'admin' as const },
    ana: {},
    luis: {},
    pepe: {},
    absent: { longTermAbsence: true },
    inactive: { active: false },
  })) {
    ids[key] = (await insertUser(h, { username: key.toUpperCase(), team: 'blancos', ...values })).id;
  }
  match = await ensureCurrentMatch(h.db, MONDAY);
  await fill();
});
afterAll(() => h.close());

describe('resetSummary', () => {
  it('counts answers by decision and guests, and whether the match has started', async () => {
    expect(await resetSummary(h.db, match, MONDAY)).toEqual({
      going: 2,
      maybe: 1,
      notGoing: 1,
      guests: 2,
      started: false,
    });
    expect((await resetSummary(h.db, match, KICKED_OFF)).started).toBe(true);
  });
});

describe('resetMatch', () => {
  it('refuses once the match has kicked off, and leaves everything in place', async () => {
    await expect(resetMatch(h.db, ids.admin, match.id, KICKED_OFF)).rejects.toEqual(new DomainError('started'));
    expect(await h.db.select().from(attendances).where(eq(attendances.matchId, match.id))).toHaveLength(4);
  });

  it('refuses when the week has rolled over since the page was loaded', async () => {
    await expect(resetMatch(h.db, ids.admin, match.id, NEXT_WEEK)).rejects.toEqual(new DomainError('stale'));
    expect(await h.db.select().from(guests).where(eq(guests.matchId, match.id))).toHaveLength(2);
  });

  it('deletes every answer and guest of the upcoming match only, and records who did it', async () => {
    const other = await ensureCurrentMatch(h.db, NEXT_WEEK);
    await h.db.insert(attendances).values({ matchId: other.id, userId: ids.ana, decision: 'going' });

    const result = await resetMatch(h.db, ids.admin, match.id, MONDAY);
    expect(result).toMatchObject({ answers: 4, guests: 2 });
    expect(result.match.id).toBe(match.id);
    expect(await resetSummary(h.db, match, MONDAY)).toMatchObject({ going: 0, maybe: 0, notGoing: 0, guests: 0 });
    expect(await h.db.select().from(attendances).where(eq(attendances.matchId, other.id))).toHaveLength(1);
    const [log] = await h.db.select().from(auditLog).where(eq(auditLog.action, 'match_reset'));
    expect(log).toMatchObject({ actorId: ids.admin, targetId: match.id, details: 'answers:4,guests:2' });
  });
});

describe('notifyMatchReset', () => {
  it('asks active players to answer again, skipping the admin, long-term absences and inactive accounts', async () => {
    for (const key of ['admin', 'ana', 'luis', 'absent', 'inactive']) {
      await saveSubscription(h.db, ids[key], { endpoint: `https://push.example/${key}`, p256dh: 'p', auth: 'a' });
    }
    const calls: { endpoint: string; payload: PushPayload }[] = [];
    const send: PushSender = async (sub, payload) => {
      calls.push({ endpoint: sub.endpoint, payload });
      return 'ok';
    };
    const text = { title: 'Reiniciada', body: 'Vuelve a apuntarte' };

    expect(await notifyMatchReset(h.db, match, ids.admin, send, text)).toEqual({ sent: 2, failed: 0, removed: 0 });
    expect(calls.map((c) => c.endpoint).sort()).toEqual(['https://push.example/ana', 'https://push.example/luis']);
    expect(calls[0].payload).toEqual({ ...text, url: '/partido', tag: `reminder-${match.id}`, matchId: match.id });
  });

  it('sends nothing when nobody has notifications on', async () => {
    const h2 = await freshDb();
    const admin = await insertUser(h2, { username: 'SOLO', role: 'admin' });
    const m = await ensureCurrentMatch(h2.db, MONDAY);
    const send: PushSender = async () => 'ok';
    expect(await notifyMatchReset(h2.db, m, admin.id, send, { title: 'x', body: 'y' })).toEqual({
      sent: 0,
      failed: 0,
      removed: 0,
    });
    await h2.close();
  });
});

describe('resetMatchSchema', () => {
  const matchId = '00000000-0000-4000-8000-000000000000';
  it('accepts REINICIAR in any case with surrounding spaces, and nothing else', () => {
    expect(resetMatchSchema.safeParse({ matchId, confirm: ' reiniciar ' }).success).toBe(true);
    const wrong = resetMatchSchema.safeParse({ matchId, confirm: 'REINICIA' });
    expect(wrong.success).toBe(false);
    expect(wrong.error?.issues[0]).toMatchObject({ path: ['confirm'], message: 'reset.confirm' });
    expect(resetMatchSchema.safeParse({ matchId: 'nope', confirm: 'REINICIAR' }).success).toBe(false);
  });
});

describe('reset texts', () => {
  it('read naturally', async () => {
    const { createTranslator } = await import('next-intl');
    const messages = (await import('../../messages/es.json')).default;
    const admin = createTranslator({ locale: 'es', messages, namespace: 'admin' });
    const t = (key: 'summary' | 'answersCount' | 'guestsCount', values: Record<string, number>) =>
      admin(`reset.${key}`, values);
    expect(t('summary', { answers: 4, going: 2, maybe: 1, notGoing: 1, guests: 2 })).toBe(
      '4 respuestas (2 Voy · 1 Duda · 1 No voy) · 2 fichajes',
    );
    expect(t('summary', { answers: 1, going: 1, maybe: 0, notGoing: 0, guests: 0 })).toBe(
      '1 respuesta (1 Voy · 0 Duda · 0 No voy) · ningún fichaje',
    );
    expect(t('summary', { answers: 0, going: 0, maybe: 0, notGoing: 0, guests: 1 })).toBe(
      'Ninguna respuesta · 1 fichaje',
    );
    expect(admin('reset.confirmBody', { total: 1, what: '1 fichaje' })).toMatch(/^Se borrará 1 fichaje\./);
    expect(admin('reset.done', { total: 5, what: '4 respuestas y 1 fichaje' })).toBe(
      'Convocatoria reiniciada: se han borrado 4 respuestas y 1 fichaje.',
    );
    expect(t('answersCount', { count: 1 })).toBe('1 respuesta');
    expect(t('guestsCount', { count: 3 })).toBe('3 fichajes');
    const push = createTranslator({ locale: 'es', messages, namespace: 'push' });
    expect(push('resetBody', { day: 'Jueves, 22 de octubre', time: '20:30' })).toBe(
      'Jueves, 22 de octubre · 20:30 — Se han borrado todas las respuestas. ¡Vuelve a apuntarte!',
    );
  });
});
