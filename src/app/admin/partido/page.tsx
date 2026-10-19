import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth/current';
import { CalendarIcon } from '@/components/icons';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getSettings } from '@/lib/match/queries';
import { resetSummary } from '@/lib/match/reset';
import { ResetMatch } from './reset-match';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Partido semanal' };

export default async function MatchSettingsPage() {
  await requireAdmin();
  const db = await getDb();
  const [t, format, settings, match] = await Promise.all([
    getTranslations('admin'),
    getFormatter(),
    getSettings(db),
    ensureCurrentMatch(db),
  ]);
  const summary = await resetSummary(db, match);
  const rawDay = format.dateTime(match.startsAt, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: settings.timezone,
  });
  const time = format.dateTime(match.startsAt, { hour: '2-digit', minute: '2-digit', timeZone: settings.timezone });

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
        <ResetMatch
          matchId={match.id}
          day={rawDay.charAt(0).toUpperCase() + rawDay.slice(1)}
          time={time}
          {...summary}
        />
      </section>
    </div>
  );
}
