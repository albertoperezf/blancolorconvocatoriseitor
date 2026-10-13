import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { sessions, users } from '@/lib/db/schema';
import { changePassword, consumeResetToken, createResetToken, findValidResetToken, login } from '@/lib/auth/service';
import { createSession, validateSessionToken } from '@/lib/auth/sessions';
import { freshDb, insertUser } from './helpers/db';

let h: DbHandle;
const PASSWORD = 'correct horse battery';

beforeAll(async () => {
  h = await freshDb();
  await insertUser(h, { username: 'PLAYER', password: PASSWORD, team: 'blancos' });
  await insertUser(h, { username: 'NOPASS' });
  await insertUser(h, { username: 'GONE', password: PASSWORD, active: false });
});
afterAll(() => h.close());

describe('login', () => {
  it('creates a session for valid credentials and stores only the token hash', async () => {
    const result = await login(h.db, 'PLAYER', PASSWORD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = await h.db.select().from(sessions);
    expect(rows.some((s) => s.id === result.token)).toBe(false);
    expect((await validateSessionToken(h.db, result.token))?.user.username).toBe('PLAYER');
  });

  it('gives the same answer for a wrong password, an unknown user, a user without password and an inactive user', async () => {
    for (const [u, pw] of [
      ['PLAYER', 'wrong password!!'],
      ['NOBODY', PASSWORD],
      ['NOPASS', PASSWORD],
      ['GONE', PASSWORD],
    ]) {
      expect(await login(h.db, u, pw)).toEqual({ ok: false, error: 'invalid' });
    }
  });

  it('never locks an account after repeated failures', async () => {
    for (let i = 0; i < 10; i++) await login(h.db, 'PLAYER', 'wrong password!!');
    expect((await login(h.db, 'PLAYER', PASSWORD)).ok).toBe(true);
  });
});

describe('sessions', () => {
  it('rejects expired sessions and deletes them', async () => {
    const [user] = await h.db.select().from(users).where(eq(users.username, 'PLAYER'));
    const past = new Date(Date.now() - 31 * 86_400_000);
    const { token } = await createSession(h.db, user.id, past);
    expect(await validateSessionToken(h.db, token)).toBeNull();
    expect(await validateSessionToken(h.db, token, past)).toBeNull();
  });

  it('extends sessions that are close to expiring', async () => {
    const [user] = await h.db.select().from(users).where(eq(users.username, 'PLAYER'));
    const created = new Date(Date.now() - 20 * 86_400_000);
    const { token, expiresAt } = await createSession(h.db, user.id, created);
    const result = await validateSessionToken(h.db, token);
    expect(result!.expiresAt.getTime()).toBeGreaterThan(expiresAt.getTime());
  });
});

describe('password reset links', () => {
  it('lets a player without password set one, once, and logs them in', async () => {
    const [user] = await h.db.select().from(users).where(eq(users.username, 'NOPASS'));
    const token = await createResetToken(h.db, user.id, null);
    expect(await findValidResetToken(h.db, token)).toMatchObject({ username: 'NOPASS' });

    const session = await consumeResetToken(h.db, token, 'a brand new password');
    expect(session).not.toBeNull();
    expect(await consumeResetToken(h.db, token, 'a brand new password')).toBeNull();
    expect((await login(h.db, 'NOPASS', 'a brand new password')).ok).toBe(true);
  });

  it('closes every existing session of that user', async () => {
    const [user] = await h.db.select().from(users).where(eq(users.username, 'PLAYER'));
    const { token: old } = await createSession(h.db, user.id);
    const reset = await createResetToken(h.db, user.id, null);
    await consumeResetToken(h.db, reset, PASSWORD);
    expect(await validateSessionToken(h.db, old)).toBeNull();
  });

  it('invalidates older links when a new one is generated, and expires after 24 h', async () => {
    const [user] = await h.db.select().from(users).where(eq(users.username, 'PLAYER'));
    const first = await createResetToken(h.db, user.id, null);
    const second = await createResetToken(h.db, user.id, null);
    expect(await findValidResetToken(h.db, first)).toBeNull();
    expect(await findValidResetToken(h.db, second, new Date(Date.now() + 25 * 3_600_000))).toBeNull();
  });
});

describe('changePassword', () => {
  it('requires the current password and keeps only the current session', async () => {
    const [user] = await h.db.select().from(users).where(eq(users.username, 'PLAYER'));
    const { token: keep } = await createSession(h.db, user.id);
    const { token: other } = await createSession(h.db, user.id);

    expect(await changePassword(h.db, user.id, 'wrong', 'another long password', keep)).toBe(false);
    expect(await changePassword(h.db, user.id, PASSWORD, 'another long password', keep)).toBe(true);
    expect(await validateSessionToken(h.db, keep)).not.toBeNull();
    expect(await validateSessionToken(h.db, other)).toBeNull();
  });
});
