import { TZDate } from '@date-fns/tz';

export type Schedule = {
  weekday: number; // 0 = Sunday … 6 = Saturday
  kickoffTime: string; // "HH:MM"
  timezone: string;
  rolloverHours: number;
};

const HOUR_MS = 3_600_000;

/** Kick-off of the match players should currently answer for. Rolls over `rolloverHours` after kick-off. */
export function currentMatchStart(now: Date, schedule: Schedule): Date {
  const [hours, minutes] = schedule.kickoffTime.split(':').map(Number);
  const local = new TZDate(now.getTime(), schedule.timezone);
  const daysAhead = (schedule.weekday - local.getDay() + 7) % 7;
  const rollover = schedule.rolloverHours * HOUR_MS;

  const at = (dayOffset: number) =>
    new TZDate(local.getFullYear(), local.getMonth(), local.getDate() + dayOffset, hours, minutes, schedule.timezone);

  for (const offset of [daysAhead - 7, daysAhead, daysAhead + 7]) {
    const start = at(offset);
    if (start.getTime() + rollover > now.getTime()) return new Date(start.getTime());
  }
  return new Date(at(daysAhead + 14).getTime());
}

/** Kick-off of the match after the one starting at `start`. */
export function nextMatchStart(start: Date, schedule: Schedule): Date {
  return currentMatchStart(new Date(start.getTime() + schedule.rolloverHours * HOUR_MS + 1), schedule);
}
