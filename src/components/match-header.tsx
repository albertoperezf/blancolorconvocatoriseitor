import { getFormatter, getTranslations } from 'next-intl/server';
import { appOrigin } from '@/lib/auth/current';
import { googleCalendarUrl, matchCalendarEvent } from '@/lib/match/calendar';
import type { Match } from '@/lib/match/queries';
import { CalendarMenu } from './calendar-menu';
import { CalendarIcon, MapPinIcon } from './icons';
import { ShareButton } from './share-button';

export async function MatchHeader({
  match,
  timezone,
  address,
  counts,
  headingLevel = 1,
}: {
  match: Match;
  timezone: string;
  address?: string;
  counts?: { going: number; maybe: number; notGoing: number };
  headingLevel?: 1 | 2;
}) {
  const [t, format, origin] = await Promise.all([getTranslations('match'), getFormatter(), appOrigin()]);
  const Heading = `h${headingLevel}` as const;
  const weekday = format.dateTime(match.startsAt, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  });
  const day = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const time = format.dateTime(match.startsAt, { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  // Google Maps universal link: opens the maps app on phones, the website on desktop.
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${match.venue}, ${address}`)}`
    : undefined;
  const event = matchCalendarEvent(
    match,
    address,
    { title: t('eventTitle'), description: t('eventDescription', { url: origin }) },
    origin,
  );
  const shareText = counts
    ? t('shareText', { day: weekday, time, venue: match.venue, ...counts, url: origin })
    : undefined;

  return (
    <div>
      <Heading className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</Heading>
      <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
        <CalendarIcon className="size-5 shrink-0 text-brand" />
        <time dateTime={match.startsAt.toISOString()}>
          {day} · {time}
        </time>
      </p>
      <p className="mt-2 flex items-start gap-2 text-muted">
        <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand" />
        <span>
          <span className="sr-only">{t('venue')}: </span>
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-link">
              {match.venue}
              <span className="sr-only"> ({t('openMap')})</span>
            </a>
          ) : (
            <span className="font-semibold text-fg">{match.venue}</span>
          )}
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
        <CalendarMenu
          googleUrl={googleCalendarUrl(event)}
          labels={{
            trigger: t('addToCalendar'),
            ics: t('calendarIcs'),
            google: t('googleCalendar'),
            opensNewTab: t('opensNewTab'),
          }}
        />
        {shareText && <ShareButton text={shareText} label={t('share')} />}
      </div>
    </div>
  );
}
