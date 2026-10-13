import { getFormatter, getTranslations } from 'next-intl/server';
import { appOrigin } from '@/lib/auth/current';
import { googleCalendarUrl, matchCalendarEvent } from '@/lib/match/calendar';
import type { Match } from '@/lib/match/queries';
import { CalendarIcon, CalendarPlusIcon, MapPinIcon } from './icons';

export async function MatchHeader({
  match,
  timezone,
  address,
  headingLevel = 1,
}: {
  match: Match;
  timezone: string;
  address?: string;
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
  // Street and number only; the full address still feeds the map search.
  const shortAddress = address?.split(',').slice(0, 2).join(',').trim();
  const event = matchCalendarEvent(
    match,
    address,
    { title: t('eventTitle'), description: t('eventDescription', { url: origin }) },
    origin,
  );

  return (
    <div>
      <Heading className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</Heading>
      <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
        <CalendarIcon className="size-5 shrink-0 text-brand" />
        <time dateTime={match.startsAt.toISOString()}>
          {day} · {time}
        </time>
      </p>
      <p className="mt-1 flex items-start gap-2 text-muted">
        <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand" />
        <span>
          <span className="sr-only">{t('venue')}: </span>
          <span className="font-semibold text-fg">{match.venue}</span>
          {address && mapsUrl && (
            <>
              <br />
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-link font-medium">
                {shortAddress}
                <span className="sr-only"> ({t('openMap')})</span>
              </a>
            </>
          )}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href="/api/calendario" download className="btn-secondary min-h-11 px-4 text-sm">
          <CalendarPlusIcon className="size-5 text-brand" />
          {t('addToCalendar')}
        </a>
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary min-h-11 px-4 text-sm"
        >
          {t('googleCalendar')}
          <span className="sr-only"> ({t('opensNewTab')})</span>
        </a>
      </div>
    </div>
  );
}
