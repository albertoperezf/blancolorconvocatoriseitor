import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { auditLog, users } from '@/lib/db/schema';
import { ensureCurrentMatch, getSquad } from '@/lib/match/queries';
import { countUpcomingGuests, enrolUser, listUsers, updateUser } from '@/lib/services/admin';
import { addGuest, DomainError, getMyDecision, removeGuest, setAttendance } from '@/lib/services/player';
import { freshDb, insertUser } from './helpers/db';

let h: DbHandle;
let admin: typeof users.$inferSelect;
let blanco: typeof users.$inferSelect;
let colorP: typeof users.$inferSelect;
let absent: typeof users.$inferSelect;

beforeAll(async () => {
  h = await freshDb();
  admin = await insertUser(h, { username: 'ADMIN', role: 'admin', team: 'color' });
  blanco = await insertUser(h, { username: 'BLANCO', team: 'blancos' });
  colorP = await insertUser(h, { username: 'COLOR', team: 'color' });
  absent = await insertUser(h, { username: 'LESIONADO', team: 'blancos', longTermAbsence: true });
});
afterAll(() => h.close());

describe('weekly match', () => {
  it('creates the current match lazily, once, with the configured venue', async () => {
    const now = new Date('2026-10-13T10:00:00Z');
    const a = await ensureCurrentMatch(h.db, now);
    const b = await ensureCurrentMatch(h.db, now);
    expect(a.id).toBe(b.id);
    expect(a.startsAt.toISOString()).toBe('2026-10-15T18:30:00.000Z');
    expect(a.venue).toBe('Polideportivo La Concepción');
  });
});

describe('attendance and guests', () => {
  it('places players by team, lets them change their mind and clear it', async () => {
    const match = await ensureCurrentMatch(h.db, new Date('2026-10-13T10:00:00Z'));
    await setAttendance(h.db, blanco.id, match.id, 'going');
    await setAttendance(h.db, colorP.id, match.id, 'maybe');
    await setAttendance(h.db, colorP.id, match.id, 'going');

    let squad = await getSquad(h.db, match.id);
    expect(squad.blancos.map((p) => p.displayName)).toEqual(['BLANCO']);
    expect(squad.color.map((p) => p.displayName)).toEqual(['COLOR']);
    expect(squad.absent.map((p) => p.displayName)).toEqual(['LESIONADO']);

    await setAttendance(h.db, blanco.id, match.id, null);
    expect(await getMyDecision(h.db, blanco.id, match.id)).toBeNull();
    squad = await getSquad(h.db, match.id);
    expect(squad.undecided.map((p) => p.displayName)).toContain('BLANCO');
  });

  it('lets long-term absences answer like anyone else, leaving the absence group', async () => {
    const match = await ensureCurrentMatch(h.db, new Date('2026-10-13T10:00:00Z'));
    await setAttendance(h.db, absent.id, match.id, 'going');
    const squad = await getSquad(h.db, match.id);
    expect(squad.blancos.map((p) => p.displayName)).toContain('LESIONADO');
    expect(squad.absent).toEqual([]);
    await setAttendance(h.db, absent.id, match.id, null);
  });

  it('allows unlimited guests, even when the host is not going, and only the host can remove them', async () => {
    const match = await ensureCurrentMatch(h.db, new Date('2026-10-13T10:00:00Z'));
    await setAttendance(h.db, blanco.id, match.id, 'not_going');
    const guests = [];
    for (const name of ['Pepe', 'Íñigo', 'Mª José']) guests.push(await addGuest(h.db, blanco.id, match.id, name));

    const squad = await getSquad(h.db, match.id);
    expect(squad.guests.map((g) => g.name)).toEqual(['Íñigo', 'Mª José', 'Pepe']);

    await expect(removeGuest(h.db, colorP.id, guests[0].id)).rejects.toBeInstanceOf(DomainError);
    await removeGuest(h.db, blanco.id, guests[0].id);
    expect((await getSquad(h.db, match.id)).guests).toHaveLength(2);
  });
});

describe('admin', () => {
  it('enrols players without a password and rejects duplicates', async () => {
    const id = await enrolUser(h.db, admin.id, {
      username: 'NUEVO',
      displayName: 'Nuevo',
      role: 'player',
      team: 'color',
    });
    const created = (await listUsers(h.db)).find((u) => u.id === id);
    expect(created).toMatchObject({ username: 'NUEVO', team: 'color', hasPassword: false });
    await expect(
      enrolUser(h.db, admin.id, { username: 'NUEVO', displayName: 'Otro', role: 'player' }),
    ).rejects.toMatchObject({ code: 'duplicate' });
  });

  it('changes team and long-term absence, and writes the audit log', async () => {
    await updateUser(h.db, admin.id, blanco.id, {
      displayName: 'Blanco',
      team: 'color',
      role: 'player',
      longTermAbsence: true,
      absenceNote: 'Rodilla',
      canBringGuests: true,
      active: true,
    });
    const [after] = await h.db.select().from(users).where(eq(users.id, blanco.id));
    expect(after).toMatchObject({ team: 'color', longTermAbsence: true, absenceNote: 'Rodilla' });
    const log = await h.db.select().from(auditLog).where(eq(auditLog.targetId, blanco.id));
    expect(log.at(-1)?.details).toContain('team');
  });

  it('lets admins stop a player from bringing guests, but not while he has guests for an upcoming match', async () => {
    const id = await enrolUser(h.db, admin.id, { username: 'SINFICHAJES', displayName: 'Sin', role: 'player' });
    const match = await ensureCurrentMatch(h.db, new Date('2026-10-13T10:00:00Z'));
    const guest = await addGuest(h.db, id, match.id, 'Antes');
    const input = {
      displayName: 'Sin',
      team: null,
      role: 'player' as const,
      longTermAbsence: false,
      absenceNote: null,
      canBringGuests: false,
      active: true,
    };

    const beforeKickoff = new Date('2026-10-14T10:00:00Z');
    expect(await countUpcomingGuests(h.db, id, beforeKickoff)).toBe(1);
    await expect(updateUser(h.db, admin.id, id, input, beforeKickoff)).rejects.toMatchObject({ code: 'has_guests' });

    const afterKickoff = new Date('2026-10-15T19:00:00Z');
    await updateUser(h.db, admin.id, id, input, afterKickoff);
    await expect(addGuest(h.db, id, match.id, 'Después')).rejects.toMatchObject({ code: 'forbidden' });
    const log = await h.db.select().from(auditLog).where(eq(auditLog.targetId, id));
    expect(log.at(-1)?.details).toBe('canBringGuests');
    await removeGuest(h.db, id, guest.id);
  });

  it('prevents admins from demoting or deactivating themselves', async () => {
    const base = {
      displayName: 'ADMIN',
      team: 'color' as const,
      longTermAbsence: false,
      absenceNote: null,
      canBringGuests: true,
    };
    await expect(updateUser(h.db, admin.id, admin.id, { ...base, role: 'player', active: true })).rejects.toMatchObject(
      {
        code: 'self_lockout',
      },
    );
    await expect(updateUser(h.db, admin.id, admin.id, { ...base, role: 'admin', active: false })).rejects.toMatchObject(
      {
        code: 'self_lockout',
      },
    );
  });
});
