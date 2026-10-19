import { getFormatter, getTranslations } from 'next-intl/server';
import type { Match } from '@/lib/match/queries';
import type { PushPayload } from './service';
import type { ComposeReminder } from './reminders';

async function when(match: Match, timezone: string) {
  const format = await getFormatter();
  const day = format.dateTime(match.startsAt, { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone });
  const time = format.dateTime(match.startsAt, { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  return { day: day.charAt(0).toUpperCase() + day.slice(1), time };
}

async function answerButtons(): Promise<Pick<PushPayload, 'actions' | 'confirm'>> {
  const t = await getTranslations('push');
  return {
    actions: [
      { action: 'going', title: t('actionGoing') },
      { action: 'not_going', title: t('actionNotGoing') },
    ],
    confirm: { going: t('confirmGoing'), not_going: t('confirmNotGoing') },
  };
}

/** Reminder text in the app's locale and the match's time zone. */
export function composeReminder(timezone: string): ComposeReminder {
  return async (match, counts) => {
    const [t, { day, time }, buttons] = await Promise.all([
      getTranslations('push'),
      when(match, timezone),
      answerButtons(),
    ]);
    return {
      title: t('reminderTitle'),
      body: t('reminderBody', { day, time, answered: counts.answered, going: counts.going }),
      ...buttons,
    };
  };
}

/** "Convocatoria reiniciada" notice, with the same Voy / No voy buttons as the reminders. */
export async function composeResetNotice(match: Match, timezone: string) {
  const [t, { day, time }, buttons] = await Promise.all([
    getTranslations('push'),
    when(match, timezone),
    answerButtons(),
  ]);
  return { title: t('resetTitle'), body: t('resetBody', { day, time }), ...buttons };
}
