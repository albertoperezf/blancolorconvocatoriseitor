import { getFormatter, getTranslations } from 'next-intl/server';
import { appOrigin } from '@/lib/auth/current';
import { capitalizeMonths } from '@/lib/dates';
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
  const weekday = capitalizeMonths(
    format.dateTime(match.startsAt, { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }),
  );
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

  // Every row shares one type style and one gap, so date, venue and actions line up evenly under the title.
  // Phones: the date itself opens the calendar menu and Share is an icon beside the title (still read last).
  const row = 'col-span-2 flex min-h-6 items-center gap-2 font-semibold md:col-span-1';
  const when = (
    <time dateTime={match.startsAt.toISOString()}>
      {day} · {time}
    </time>
  );
  const calendarLabels = {
    trigger: t('addToCalendar'),
    ics: t('calendarIcs'),
    google: t('googleCalendar'),
    opensNewTab: t('opensNewTab'),
  };
  return (
    // Phones: pb-1.5 matches the title's empty line space above the capitals, since the last row there is an
    // underlined link that reaches its own bottom; the card then looks as tall above as below.
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 max-md:pb-1.5 md:grid-cols-1 md:gap-y-3">
      <Heading className="col-start-1 row-start-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
        {t('title')}
      </Heading>
      <div className={row}>
        <CalendarIcon className="size-5 shrink-0 text-brand" />
        <span className="max-md:hidden">{when}</span>
        <CalendarMenu
          className="md:hidden"
          googleUrl={googleCalendarUrl(event)}
          labels={calendarLabels}
          trigger={when}
        />
      </div>
      <p className={row}>
        <MapPinIcon className="size-5 shrink-0 text-brand" />
        <span>
          <span className="sr-only">{t('venue')}: </span>
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-link">
              {match.venue}
              <span className="sr-only"> ({t('openMap')})</span>
            </a>
          ) : (
            match.venue
          )}
        </span>
      </p>
      <div className="col-start-2 row-start-1 flex items-center md:col-start-1 md:row-start-auto md:flex-wrap md:gap-x-6 md:gap-y-3">
        <CalendarMenu className="max-md:hidden" googleUrl={googleCalendarUrl(event)} labels={calendarLabels} />
        {shareText && <ShareButton text={shareText} label={t('share')} />}
      </div>
    </div>
  );
}
