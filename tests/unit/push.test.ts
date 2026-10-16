import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { attendances, guests, pushSubscriptions } from '@/lib/db/schema';
import { ensureCurrentMatch } from '@/lib/match/queries';
import { reminderKindFor, runReminder, type ComposeReminder } from '@/lib/push/reminders';
import { deleteSubscription, saveSubscription, type PushPayload, type PushSender } from '@/lib/push/service';
import { freshDb, insertUser } from './helpers/db';

const MADRID = 'Europe/Madrid';
// Thursday 22 Oct 2026, 20:30 Madrid (CEST) is the match; reminders on Monday 19 and Wednesday 21.
const MONDAY = new Date('2026-10-19T09:00:00Z');
const TUESDAY = new Date('2026-10-20T09:00:00Z');
const WEDNESDAY = new Date('2026-10-21T09:00:00Z');

const compose: ComposeReminder = async (_match, counts) => ({
  title: 'Recordatorio',
  body: `respondido ${counts.answered}, van ${counts.going}`,
});

function fakeSender() {
  const calls: { endpoint: string; payload: PushPayload }[] = [];
  const send: PushSender = async (sub, payload) => {
    calls.push({ endpoint: sub.endpoint, payload });
    return sub.endpoint.includes('gone') ? 'gone' : 'ok';
  };
  return { calls, send };
}

const sub = (name: string) => ({ endpoint: `https://push.example/${name}`, p256dh: 'p', auth: 'a' });

describe('reminderKindFor', () => {
  it('maps Madrid Mondays and Wednesdays to the two reminders and skips other days', () => {
    expect(reminderKindFor(MONDAY, MADRID)).toBe('monday');
    expect(reminderKindFor(WEDNESDAY, MADRID)).toBe('wednesday');
    expect(reminderKindFor(TUESDAY, MADRID)).toBeNull();
    // 23:30 UTC on Sunday is already Monday in Madrid.
    expect(reminderKindFor(new Date('2026-10-18T23:30:00Z'), MADRID)).toBe('monday');
  });
});

describe('runReminder', () => {
  let h: DbHandle;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    h = await freshDb();
    for (const [key, values] of Object.entries({
      answered: {},
      pending: {},
      pendingNoDevice: {},
      absent: { longTermAbsence: true },
      inactive: { active: false },
    })) {
      ids[key] = (await insertUser(h, { username: key.toUpperCase(), team: 'blancos', ...values })).id;
    }
    const match = await ensureCurrentMatch(h.db, MONDAY);
    await h.db.insert(attendances).values({ matchId: match.id, userId: ids.answered, decision: 'going' });
    await h.db.insert(guests).values({ matchId: match.id, hostId: ids.answered, name: 'Invitado' });
    await saveSubscription(h.db, ids.answered, sub('answered'));
    await saveSubscription(h.db, ids.pending, sub('pending-phone'));
    await saveSubscription(h.db, ids.pending, sub('pending-gone'));
    await saveSubscription(h.db, ids.absent, sub('absent'));
    await saveSubscription(h.db, ids.inactive, sub('inactive'));
  });
  afterAll(() => h.close());

  it('on Monday notifies only active players who have not answered, and drops dead subscriptions', async () => {
    const { calls, send } = fakeSender();
    const result = await runReminder(h.db, { now: MONDAY, send, compose });
    expect(result).toEqual({ kind: 'monday', sent: 1, failed: 0, removed: 1 });
    expect(calls.map((c) => c.endpoint).sort()).toEqual([sub('pending-gone').endpoint, sub('pending-phone').endpoint]);
    expect(calls[0].payload).toMatchObject({
      title: 'Recordatorio',
      body: 'respondido 1, van 2',
      url: '/partido',
      matchId: expect.any(String),
    });
    const remaining = await h.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, ids.pending));
    expect(remaining.map((s) => s.endpoint)).toEqual([sub('pending-phone').endpoint]);
  });

  it('sends each reminder only once per match, even if the job runs again', async () => {
    const { calls, send } = fakeSender();
    expect(await runReminder(h.db, { now: MONDAY, send, compose })).toEqual({
      skipped: 'already-sent',
      kind: 'monday',
    });
    expect(calls).toHaveLength(0);
  });

  it('skips days without a reminder and sends the Wednesday one separately', async () => {
    const { calls, send } = fakeSender();
    expect(await runReminder(h.db, { now: TUESDAY, send, compose })).toEqual({ skipped: 'not-a-reminder-day' });
    expect(await runReminder(h.db, { now: WEDNESDAY, send, compose })).toEqual({
      kind: 'wednesday',
      sent: 1,
      failed: 0,
      removed: 0,
    });
    expect(calls.map((c) => c.endpoint)).toEqual([sub('pending-phone').endpoint]);
  });
});

describe('push subscriptions', () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await freshDb();
  });
  afterAll(() => h.close());

  it('moves a device to whoever subscribes with it last and only lets its owner remove it', async () => {
    const ana = (await insertUser(h, { username: 'ANA' })).id;
    const luis = (await insertUser(h, { username: 'LUIS' })).id;
    await saveSubscription(h.db, ana, sub('shared'));
    await saveSubscription(h.db, luis, { ...sub('shared'), auth: 'new' });
    let [row] = await h.db.select().from(pushSubscriptions);
    expect(row).toMatchObject({ userId: luis, auth: 'new' });

    await deleteSubscription(h.db, ana, sub('shared').endpoint);
    expect(await h.db.select().from(pushSubscriptions)).toHaveLength(1);
    await deleteSubscription(h.db, luis, sub('shared').endpoint);
    [row] = await h.db.select().from(pushSubscriptions);
    expect(row).toBeUndefined();
  });
});

describe('reminder text', () => {
  it('reads naturally for none, one and several answers', async () => {
    const { createTranslator } = await import('next-intl');
    const messages = (await import('../../messages/es.json')).default;
    const t = createTranslator({ locale: 'es', messages, namespace: 'push' });
    const body = (answered: number, going: number) =>
      t('reminderBody', { day: 'Jueves 22 de octubre', time: '20:30', answered, going });
    expect(t('reminderTitle')).toBe('¡Apúntate, anda! ⚽');
    expect(body(9, 6)).toBe('Jueves 22 de octubre · 20:30 — ya han respondido 9 (6 van).');
    expect(body(1, 1)).toBe('Jueves 22 de octubre · 20:30 — ya ha respondido 1 (1 va).');
    expect(body(0, 0)).toBe('Jueves 22 de octubre · 20:30 — nadie ha respondido todavía.');
  });
});
