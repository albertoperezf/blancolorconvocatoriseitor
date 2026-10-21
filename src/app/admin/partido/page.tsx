import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth/current';
import { CalendarIcon } from '@/components/icons';
import { capitalizeMonths } from '@/lib/dates';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getCancelledMatch, getSettings, type Match } from '@/lib/match/queries';
import { resetSummary } from '@/lib/match/reset';
import { CancelMatch } from './cancel-match';
import { ResetMatch } from './reset-match';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Partido semanal' };

export default async function MatchSettingsPage() {
  await requireAdmin();
  const db = await getDb();
  const [t, format, settings, match, cancelled] = await Promise.all([
    getTranslations('admin'),
    getFormatter(),
    getSettings(db),
    ensureCurrentMatch(db),
    getCancelledMatch(db),
  ]);
  const summary = await resetSummary(db, match);
  const dayOf = (m: Match) => {
    const raw = capitalizeMonths(
      format.dateTime(m.startsAt, { weekday: 'long', day: 'numeric', month: 'long', timeZone: settings.timezone }),
    );
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const timeOf = (m: Match) =>
    format.dateTime(m.startsAt, { hour: '2-digit', minute: '2-digit', timeZone: settings.timezone });
  const day = dayOf(match);
  const time = timeOf(match);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('settings')}</h1>
      <p className="mt-1 text-muted">{t('settingsIntro')}</p>
      {/* Rarely changed, so folded; the row shows the current day, time and venue. */}
      <section aria-labelledby="details-heading" className="card mt-4 p-0 sm:p-0">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
            <CalendarIcon className="size-5 shrink-0" />
            <span className="min-w-0">
              <span id="details-heading" className="block text-xl font-extrabold">
                {t('detailsHeading')}
              </span>
              <span className="block truncate text-sm text-muted">
                {(t.raw('weekdays') as string[])[settings.weekday]} · {settings.kickoffTime} · {settings.venue}
              </span>
            </span>
            <span aria-hidden className="ml-auto text-muted transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <SettingsForm settings={settings} />
          </div>
        </details>
      </section>
      <section aria-labelledby="reset-heading" className="card mt-6">
        <ResetMatch matchId={match.id} day={day} time={time} {...summary} />
      </section>
      <section aria-labelledby="cancel-heading" className="card mt-6">
        <CancelMatch
          open={{ id: match.id, day, time }}
          cancelled={
            cancelled && {
              id: cancelled.id,
              day: dayOf(cancelled),
              time: timeOf(cancelled),
              reason: cancelled.cancelReason ?? '',
              by: cancelled.cancelledByName,
            }
          }
        />
      </section>
    </div>
  );
}
