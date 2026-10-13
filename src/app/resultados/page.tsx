import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ShirtIcon } from '@/components/icons';
import { getCurrentUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { getSettings } from '@/lib/match/queries';
import { listPlayedMatches, matchWinner, seasonSummary, type Winner } from '@/lib/match/results';
import { ResultForm } from './result-form';

export const metadata: Metadata = {
  title: 'Resultados',
  description: 'Resultados de los partidos de los jueves entre Blancos y Color.',
  alternates: { canonical: '/resultados' },
};

const BADGE: Record<Winner, string> = {
  blancos: 'border-fg/40 bg-surface text-fg',
  color: 'border-brand bg-brand text-brand-fg',
  draw: 'border-border bg-bg text-fg',
};

export default async function ResultsPage() {
  const db = await getDb();
  const [t, format, user, settings, played] = await Promise.all([
    getTranslations('results'),
    getFormatter(),
    getCurrentUser(),
    getSettings(db),
    listPlayedMatches(db),
  ]);
  const isAdmin = user?.role === 'admin';
  const summary = seasonSummary(played);

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h1>
      <p className="mt-1 text-muted">{t('intro')}</p>
      {summary.total > 0 && (
        <section aria-labelledby="summary-heading" className="card mt-4">
          <h2 id="summary-heading" className="font-extrabold">
            {t('summaryHeading', { count: summary.total })}
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['blancos', t('summaryBlancos'), <ShirtIcon key="b" className="mx-auto size-5" />],
                ['color', t('summaryColor'), <ShirtIcon key="c" filled className="mx-auto size-5 text-brand" />],
                [
                  'draw',
                  t('summaryDraw'),
                  <span key="d" aria-hidden className="mx-auto flex size-5 items-center justify-center font-extrabold">
                    =
                  </span>,
                ],
              ] as const
            ).map(([key, label, icon]) => (
              <div key={key} className="rounded-xl bg-bg px-2 py-3">
                <dt className="flex flex-col items-center gap-1 text-sm text-muted">
                  {icon}
                  {label}
                </dt>
                <dd className="text-3xl font-extrabold tabular-nums">{summary[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {played.length === 0 ? (
        <p className="card mt-4 text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {played.map((m) => {
            const raw = format.dateTime(m.startsAt, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: settings.timezone,
            });
            const date = raw.charAt(0).toUpperCase() + raw.slice(1);
            const hasResult = m.blancosGoals !== null && m.colorGoals !== null;
            const winner = hasResult ? matchWinner(m.blancosGoals!, m.colorGoals!) : null;
            return (
              <li key={m.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-extrabold">
                    <time dateTime={m.startsAt.toISOString()}>{date}</time>
                  </h2>
                  {winner ? (
                    <span className={`rounded-full border px-3 py-0.5 text-sm font-bold ${BADGE[winner]}`}>
                      <span className="sr-only">{t('resultLabel')}: </span>
                      {t(`winner.${winner}`)}
                    </span>
                  ) : (
                    <span className="rounded-full border border-dashed border-border px-3 py-0.5 text-sm text-muted">
                      {t('pending')}
                    </span>
                  )}
                </div>
                {hasResult && (
                  <p className="mt-3 flex items-center justify-center gap-3 text-xl font-extrabold tabular-nums sm:text-2xl">
                    <span className="inline-flex items-center gap-1.5">
                      <ShirtIcon className="size-5" />
                      {t('blancos')}
                    </span>
                    <span>
                      {m.blancosGoals} – {m.colorGoals}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {t('color')}
                      <ShirtIcon filled className="size-5 text-brand" />
                    </span>
                  </p>
                )}
                {isAdmin && (
                  <ResultForm
                    matchId={m.id}
                    legend={t('legend', { date })}
                    blancos={m.blancosGoals}
                    color={m.colorGoals}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
