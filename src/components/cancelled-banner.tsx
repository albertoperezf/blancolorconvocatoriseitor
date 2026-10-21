import { getFormatter, getTranslations } from 'next-intl/server';
import { appOrigin } from '@/lib/auth/current';
import { capitalizeMonths } from '@/lib/dates';
import type { Match } from '@/lib/match/queries';
import { BanIcon } from './icons';
import { ShareButton } from './share-button';

/** Announces this week's called-off match above the next convocatoria, until it would have rolled over. */
export async function CancelledBanner({ match, timezone }: { match: Match; timezone: string }) {
  const [t, format, origin] = await Promise.all([getTranslations('match'), getFormatter(), appOrigin()]);
  const weekday = capitalizeMonths(
    format.dateTime(match.startsAt, { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }),
  );
  const day = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const time = format.dateTime(match.startsAt, { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  const reason = match.cancelReason ?? '';

  return (
    <section aria-labelledby="cancelled-heading" className="card mt-2 border-l-4 border-l-danger bg-danger-bg">
      <div className="flex items-center gap-2">
        <BanIcon className="size-6 shrink-0 text-danger" />
        <h2 id="cancelled-heading" className="text-xl font-extrabold text-danger">
          {t('cancelledTitle')}
        </h2>
        <span className="ml-auto">
          <ShareButton text={t('cancelledShareText', { day: weekday, time, reason, url: origin })} label={t('share')} />
        </span>
      </div>
      <p className="mt-2 font-semibold">
        <time dateTime={match.startsAt.toISOString()}>
          {day} · {time}
        </time>
      </p>
      <p className="mt-1 font-semibold">{t('cancelledReason', { reason })}</p>
      <p className="mt-1 text-sm">{t('cancelledNext')}</p>
    </section>
  );
}
