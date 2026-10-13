import { describe, expect, it } from 'vitest';
import { buildIcs, googleCalendarUrl, matchCalendarEvent, toIcsUtc } from '@/lib/match/calendar';

const match = { id: 'abc', startsAt: new Date('2026-10-15T18:30:00Z'), venue: 'Polideportivo La Concepción' };
const address = 'C. de José del Hierro, 5, Ciudad Lineal, 28027 Concepción, Madrid';
const event = matchCalendarEvent(
  match,
  address,
  { title: 'Partido Blancolores', description: 'Di si vas: https://example.com' },
  'https://example.com',
);

describe('calendar', () => {
  it('builds a 60-minute event at the venue and address', () => {
    expect(event.end.toISOString()).toBe('2026-10-15T19:30:00.000Z');
    expect(event.location).toBe(`Polideportivo La Concepción, ${address}`);
    expect(toIcsUtc(event.start)).toBe('20261015T183000Z');
  });

  it('produces a valid iCalendar file: CRLF, escaped text, folded long lines', () => {
    const ics = buildIcs(event, new Date('2026-10-13T10:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261015T183000Z\r\n');
    expect(ics).toContain('DTEND:20261015T193000Z\r\n');
    expect(ics).toContain('UID:match-abc@blancolores\r\n');

    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('LOCATION:Polideportivo La Concepción\\, C. de José del Hierro\\, 5\\,');
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('builds a Google Calendar template link', () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261015T183000Z/20261015T193000Z');
    expect(url.searchParams.get('location')).toContain('José del Hierro');
  });
});
