import { getFormatter, getTranslations } from 'next-intl/server';
import type { ComposeReminder } from './reminders';

/** Reminder text in the app's locale and the match's time zone. */
export function composeReminder(timezone: string): ComposeReminder {
  return async (match, counts) => {
    const [t, format] = await Promise.all([getTranslations('push'), getFormatter()]);
    const weekday = format.dateTime(match.startsAt, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: timezone,
    });
    const time = format.dateTime(match.startsAt, { hour: '2-digit', minute: '2-digit', timeZone: timezone });
    return {
      title: t('reminderTitle'),
      body: t('reminderBody', {
        day: weekday.charAt(0).toUpperCase() + weekday.slice(1),
        time,
        answered: counts.answered,
        going: counts.going,
      }),
      actions: [
        { action: 'going', title: t('actionGoing') },
        { action: 'not_going', title: t('actionNotGoing') },
      ],
      confirm: { going: t('confirmGoing'), not_going: t('confirmNotGoing') },
    };
  };
}
