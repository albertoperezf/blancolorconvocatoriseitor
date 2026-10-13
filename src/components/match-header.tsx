import { getFormatter, getTranslations } from 'next-intl/server';
import type { Match } from '@/lib/match/queries';
import { CalendarIcon, MapPinIcon } from './icons';

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
  const [t, format] = await Promise.all([getTranslations('match'), getFormatter()]);
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
    </div>
  );
}
