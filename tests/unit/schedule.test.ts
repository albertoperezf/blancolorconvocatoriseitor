import { describe, expect, it } from 'vitest';
import { currentMatchStart, type Schedule } from '@/lib/match/schedule';

const THURSDAY_2030: Schedule = { weekday: 4, kickoffTime: '20:30', timezone: 'Europe/Madrid', rolloverHours: 2 };

describe('currentMatchStart', () => {
  it('returns this week’s Thursday 20:30 Madrid time on a Monday', () => {
    const start = currentMatchStart(new Date('2026-10-12T09:00:00Z'), THURSDAY_2030);
    expect(start.toISOString()).toBe('2026-10-15T18:30:00.000Z'); // CEST = UTC+2
  });

  it('keeps the same match until 2 h after kick-off', () => {
    const start = currentMatchStart(new Date('2026-10-15T20:29:00Z'), THURSDAY_2030);
    expect(start.toISOString()).toBe('2026-10-15T18:30:00.000Z');
  });

  it('rolls over to next week once the rollover window has passed', () => {
    const start = currentMatchStart(new Date('2026-10-15T20:31:00Z'), THURSDAY_2030);
    expect(start.toISOString()).toBe('2026-10-22T18:30:00.000Z');
  });

  it('handles the switch from summer to winter time (25 Oct 2026)', () => {
    const start = currentMatchStart(new Date('2026-10-23T10:00:00Z'), THURSDAY_2030);
    expect(start.toISOString()).toBe('2026-10-29T19:30:00.000Z'); // CET = UTC+1
  });

  it('handles the switch from winter to summer time (29 Mar 2026)', () => {
    const start = currentMatchStart(new Date('2026-03-27T10:00:00Z'), THURSDAY_2030);
    expect(start.toISOString()).toBe('2026-04-02T18:30:00.000Z');
  });

  it('respects a long rollover that spans into the next day', () => {
    const start = currentMatchStart(new Date('2026-10-16T08:00:00Z'), { ...THURSDAY_2030, rolloverHours: 24 });
    expect(start.toISOString()).toBe('2026-10-15T18:30:00.000Z');
  });

  it('uses the configured weekday', () => {
    const start = currentMatchStart(new Date('2026-10-12T09:00:00Z'), {
      ...THURSDAY_2030,
      weekday: 1,
      kickoffTime: '10:00',
    });
    expect(start.toISOString()).toBe('2026-10-12T08:00:00.000Z');
  });
});
