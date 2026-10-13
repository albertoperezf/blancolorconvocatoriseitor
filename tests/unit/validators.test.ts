import { describe, expect, it } from 'vitest';
import { enrolSchema, guestNameSchema, loginSchema, newPasswordSchema, settingsSchema } from '@/lib/validators';

describe('validators', () => {
  it('accepts Spanish guest names and normalises spaces', () => {
    expect(guestNameSchema.parse('  Íñigo   Mª  ')).toBe('Íñigo Mª');
    expect(guestNameSchema.parse("O'Neill-Peña")).toBe("O'Neill-Peña");
  });

  it('rejects guest names with markup or too short', () => {
    expect(guestNameSchema.safeParse('<script>').success).toBe(false);
    expect(guestNameSchema.safeParse('A').success).toBe(false);
  });

  it('upper-cases usernames like the legacy site', () => {
    expect(loginSchema.parse({ username: ' alberto ', password: 'x' }).username).toBe('ALBERTO');
    expect(enrolSchema.parse({ username: 'pepe.g', displayName: 'Pepe' })).toMatchObject({
      username: 'PEPE.G',
      role: 'player',
    });
  });

  it('requires 12+ char passwords that match', () => {
    expect(newPasswordSchema.safeParse({ password: 'short', confirm: 'short' }).success).toBe(false);
    const mismatch = newPasswordSchema.safeParse({ password: 'a-long-password', confirm: 'another-one!!' });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]).toMatchObject({ message: 'password.mismatch', path: ['confirm'] });
  });

  it('validates match settings', () => {
    const address = 'C. de José del Hierro, 5, Madrid';
    expect(
      settingsSchema.parse({ weekday: '4', kickoffTime: '20:30', venue: 'Polideportivo', address, rolloverHours: '2' }),
    ).toEqual({
      weekday: 4,
      kickoffTime: '20:30',
      venue: 'Polideportivo',
      address,
      rolloverHours: 2,
    });
    expect(
      settingsSchema.safeParse({ weekday: 7, kickoffTime: '25:00', venue: 'X', address: '', rolloverHours: 1 }).success,
    ).toBe(false);
  });
});
