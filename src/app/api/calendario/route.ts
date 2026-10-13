import { getTranslations } from 'next-intl/server';
import { appOrigin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { buildIcs, matchCalendarEvent } from '@/lib/match/calendar';
import { ensureCurrentMatch, getSettings } from '@/lib/match/queries';

export async function GET() {
  const db = await getDb();
  const [t, origin, settings, match] = await Promise.all([
    getTranslations({ locale: 'es', namespace: 'match' }),
    appOrigin(),
    getSettings(db),
    ensureCurrentMatch(db),
  ]);
  const event = matchCalendarEvent(
    match,
    settings.address,
    { title: t('eventTitle'), description: t('eventDescription', { url: origin }) },
    origin,
  );
  const day = match.startsAt.toISOString().slice(0, 10);

  return new Response(buildIcs(event), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="blancolores-${day}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
