import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import {
  attendances,
  auditLog,
  guests,
  passwordResetRequests,
  passwordResetTokens,
  pushSubscriptions,
  sessions,
  users,
} from '@/lib/db/schema';
import { createResetToken, login, requestPasswordReset } from '@/lib/auth/service';
import { createSession } from '@/lib/auth/sessions';
import { listMatchScorers, saveMatchResult, topScorers } from '@/lib/match/goals';
import { ensureCurrentMatch, type Match } from '@/lib/match/queries';
import { listPlayedMatches } from '@/lib/match/results';
import { saveSubscription } from '@/lib/push/service';
import { deleteUser, enrolUser, getUser, listUsers } from '@/lib/services/admin';
import { DomainError } from '@/lib/services/player';
import { freshDb, insertUser } from './helpers/db';

// Played on Thursday 15 Oct 2026; the next match is Thursday 22.
const NOW = new Date('2026-10-19T09:00:00Z');
const PASSWORD = 'una contraseña larga';

let h: DbHandle;
let admin: typeof users.$inferSelect;
let pepe: typeof users.$inferSelect;
let past: Match;
let next: Match;

beforeAll(async () => {
  h = await freshDb();
  admin = await insertUser(h, { username: 'ADMIN', role: 'admin' });
  pepe = await insertUser(h, { username: 'PEPE', displayName: 'Pepe', team: 'blancos', password: PASSWORD });
  past = await ensureCurrentMatch(h.db, new Date('2026-10-13T10:00:00Z'));
  next = await ensureCurrentMatch(h.db, NOW);
  await h.db.insert(attendances).values([
    { matchId: past.id, userId: pepe.id, decision: 'going' },
    { matchId: next.id, userId: pepe.id, decision: 'going' },
  ]);
  await h.db.insert(guests).values([
    { matchId: past.id, hostId: pepe.id, name: 'Primo de Pepe' },
    { matchId: next.id, hostId: pepe.id, name: 'Cuñado de Pepe' },
  ]);
  await saveMatchResult(
    h.db,
    pepe.id,
    past.id,
    { blancos: 2, color: 0 },
    [{ team: 'blancos', kind: 'user', id: pepe.id, goals: 2 }],
    NOW,
  );
  await createSession(h.db, pepe.id, NOW);
  await saveSubscription(h.db, pepe.id, { endpoint: 'https://push.example/pepe', p256dh: 'p', auth: 'a' });
  await createResetToken(h.db, pepe.id, admin.id, NOW);
  await requestPasswordReset(h.db, 'PEPE');
});
afterAll(() => h.close());

describe('deleteUser', () => {
  it('refuses to delete yourself', async () => {
    await expect(deleteUser(h.db, admin.id, admin.id, NOW)).rejects.toEqual(new DomainError('self_lockout'));
  });

  it('removes the account, devices, links and next-match plans, and frees the username', async () => {
    await deleteUser(h.db, admin.id, pepe.id, NOW);

    expect((await listUsers(h.db)).map((u) => u.username)).toEqual(['ADMIN']);
    expect(await getUser(h.db, pepe.id)).toBeNull();
    expect(await login(h.db, 'PEPE', PASSWORD)).toEqual({ ok: false, error: 'invalid' });
    for (const [table, column] of [
      [sessions, sessions.userId],
      [pushSubscriptions, pushSubscriptions.userId],
      [passwordResetTokens, passwordResetTokens.userId],
      [passwordResetRequests, passwordResetRequests.userId],
    ] as const) {
      expect(await h.db.select().from(table).where(eq(column, pepe.id))).toHaveLength(0);
    }
    const plans = (matchId: string) =>
      Promise.all([
        h.db
          .select()
          .from(attendances)
          .where(and(eq(attendances.matchId, matchId), eq(attendances.userId, pepe.id))),
        h.db
          .select()
          .from(guests)
          .where(and(eq(guests.matchId, matchId), eq(guests.hostId, pepe.id))),
      ]);
    expect((await plans(next.id)).map((rows) => rows.length)).toEqual([0, 0]);
    expect((await plans(past.id)).map((rows) => rows.length)).toEqual([1, 1]);

    await enrolUser(h.db, admin.id, { username: 'PEPE', displayName: 'Otro Pepe', role: 'player' });
    const [log] = await h.db.select().from(auditLog).where(eq(auditLog.action, 'user_deleted'));
    expect(log).toMatchObject({ actorId: admin.id, targetId: pepe.id, details: 'Pepe' });
  });

  it('keeps past goals and results under the real name, tagged', async () => {
    expect((await topScorers(h.db))[0]).toMatchObject({ name: 'Pepe (Eliminado)', goals: 2 });
    expect((await listMatchScorers(h.db, [past.id]))[0]).toMatchObject({ name: 'Pepe (Eliminado)', goals: 2 });
    const [played] = await listPlayedMatches(h.db, NOW);
    expect(played.resultByName).toBe('Pepe (Eliminado)');
  });

  it('cannot delete the same player twice', async () => {
    await expect(deleteUser(h.db, admin.id, pepe.id, NOW)).rejects.toEqual(new DomainError('not_found'));
  });
});
