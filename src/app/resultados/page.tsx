import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ExternalLink } from '@/components/external-link';
import { BallIcon, NewspaperIcon, PlayIcon, ShirtIcon } from '@/components/icons';
import { getCurrentUser } from '@/lib/auth/current';
import { canEditResults } from '@/lib/auth/roles';
import { getDb } from '@/lib/db';
import type { Team } from '@/lib/db/schema';
import { BLOG_URL, VIDEOS_URL } from '@/lib/links';
import { buildScorerColumns, listMatchScorers, scorerCandidates, topScorers } from '@/lib/match/goals';
import { ensureCurrentMatch, getSettings } from '@/lib/match/queries';
import { canEditMatch, listPlayedMatches, matchWinner, seasonSummary, type Winner } from '@/lib/match/results';
import { nextMatchStart } from '@/lib/match/schedule';
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
  // Creates this week's match once it exists, so it becomes the latest played one on kick-off.
  await ensureCurrentMatch(db);
  const [t, tFooter, format, user, settings, played, pichichi] = await Promise.all([
    getTranslations('results'),
    getTranslations('footer'),
    getFormatter(),
    getCurrentUser(),
    getSettings(db),
    listPlayedMatches(db),
    topScorers(db),
  ]);
  const canEdit = !!user && canEditResults(user.role);
  const summary = seasonSummary(played);
  const matchIds = played.map((m) => m.id);
  const latest = played[0];
  const editable = (matchId: string) => canEdit && canEditMatch(user.role, matchId, latest?.id);
  // Editors lose the latest match when the next one kicks off; admins can always fix any.
  const lockNote =
    canEdit && user.role !== 'admin' && latest
      ? (() => {
          const next = nextMatchStart(latest.startsAt, settings);
          const opts = { timeZone: settings.timezone } as const;
          return t('editableUntil', {
            day: format.dateTime(next, { ...opts, weekday: 'long', day: 'numeric', month: 'long' }),
            time: format.dateTime(next, { ...opts, hour: '2-digit', minute: '2-digit' }),
          });
        })()
      : undefined;
  const [scorers, candidates] = await Promise.all([
    listMatchScorers(db, matchIds),
    canEdit ? scorerCandidates(db, matchIds) : null,
  ]);
  const scorersFor = (matchId: string, team: Team) => scorers.filter((s) => s.matchId === matchId && s.team === team);

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
      {pichichi.length > 0 && (
        <section aria-labelledby="pichichi-heading" className="card mt-4">
          <h2 id="pichichi-heading" className="flex items-center gap-2 font-extrabold">
            <BallIcon className="size-5 text-brand" />
            {t('pichichiHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('pichichiIntro')}</p>
          <ol className="mt-3 flex flex-col gap-1">
            {pichichi.map((p) => (
              <li key={p.userId} className="flex min-h-10 items-center gap-3 rounded-lg bg-bg px-3">
                <span className="w-5 text-center font-extrabold text-muted tabular-nums">{p.rank}</span>
                <ShirtIcon
                  filled={p.team === 'color'}
                  className={`size-5 shrink-0 ${p.team === 'color' ? 'text-brand' : ''} ${p.team ? '' : 'opacity-0'}`}
                />
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <span className="font-extrabold tabular-nums">{t('goalsCount', { count: p.goals })}</span>
              </li>
            ))}
          </ol>
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
              <li key={m.id} className="card min-w-0">
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
                      {m.id === latest?.id ? t('pending') : t('noResult')}
                    </span>
                  )}
                </div>
                {hasResult && (
                  <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 text-xl font-extrabold tabular-nums sm:text-2xl">
                    <span className="inline-flex items-center gap-1.5">
                      <ShirtIcon className="size-5" />
                      {t('blancos')}
                    </span>
                    <span className="whitespace-nowrap">
                      {m.blancosGoals} – {m.colorGoals}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {t('color')}
                      <ShirtIcon filled className="size-5 text-brand" />
                    </span>
                  </p>
                )}
                {hasResult && scorers.some((s) => s.matchId === m.id) && (
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    {(['blancos', 'color'] as const).map((team) => {
                      const list = scorersFor(m.id, team);
                      return (
                        <p key={team} className={team === 'blancos' ? 'text-right' : 'text-left'}>
                          {list.length > 0 && (
                            <>
                              <span className="sr-only">{t('scorersOf', { team: t(`winner.${team}`) })}: </span>
                              <BallIcon className="mr-1 inline size-4 align-[-0.15em] text-muted" />
                              {list.map((s) => (s.goals > 1 ? `${s.name} ×${s.goals}` : s.name)).join(', ')}
                            </>
                          )}
                        </p>
                      );
                    })}
                  </div>
                )}
                {hasResult && m.resultByName && (
                  <p className="mt-2 text-center text-xs text-muted">{t('enteredBy', { name: m.resultByName })}</p>
                )}
                {candidates && editable(m.id) && (
                  <ResultForm
                    matchId={m.id}
                    legend={t('legend', { date })}
                    blancos={m.blancosGoals}
                    color={m.colorGoals}
                    scorers={buildScorerColumns(m.id, candidates, scorers)}
                    defaultOpen={m.id === latest?.id && !hasResult}
                    note={m.id === latest?.id ? lockNote : undefined}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <section aria-labelledby="more-heading" className="card mt-6">
        <h2 id="more-heading" className="font-extrabold">
          {t('moreHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('moreIntro')}</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              [BLOG_URL, NewspaperIcon, tFooter('blog'), t('blogCta')],
              [VIDEOS_URL, PlayIcon, tFooter('videos'), t('videosCta')],
            ] as const
          ).map(([href, Icon, name, cta]) => (
            <li key={href}>
              <ExternalLink
                href={href}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3 transition-colors hover:border-brand"
              >
                <Icon className="size-6 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{name}</span>
                  <span className="block text-sm text-muted">{cta}</span>
                </span>
              </ExternalLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
