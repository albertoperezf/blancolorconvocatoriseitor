'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ShirtIcon } from '@/components/icons';
import type { Team } from '@/lib/db/schema';
import type { ScorerColumn, ScorerOption } from '@/lib/match/goals';

const TEAMS: Team[] = ['blancos', 'color'];
const MAX_GOALS = 99;

type Columns = Record<Team, ScorerColumn>;

/** Per-player goal counters for both teams; the chosen scorers travel as JSON in the `scorers` field. */
export function ScorersEditor({
  initial,
  score,
  error,
}: {
  initial: Columns;
  score: Record<Team, number | null>;
  error?: string;
}) {
  const t = useTranslations('results');
  const [columns, setColumns] = useState(initial);
  const [startOpen] = useState(() => TEAMS.some((team) => initial[team].listed.some((s) => s.goals > 0)));

  const setGoals = (team: Team, key: string, delta: number) =>
    setColumns((c) => ({
      ...c,
      [team]: {
        ...c[team],
        listed: c[team].listed.map((s) =>
          `${s.kind}:${s.id}` === key ? { ...s, goals: Math.min(MAX_GOALS, Math.max(0, s.goals + delta)) } : s,
        ),
      },
    }));

  const addPlayer = (team: Team, option: ScorerOption) =>
    setColumns((c) => ({
      ...c,
      [team]: {
        listed: [...c[team].listed, { ...option, goals: 1 }],
        extra: c[team].extra.filter((o) => o.id !== option.id),
      },
    }));

  const assigned = (team: Team) => columns[team].listed.reduce((n, s) => n + s.goals, 0);
  const total = TEAMS.reduce((n, team) => n + (score[team] ?? 0), 0);
  const payload = TEAMS.flatMap((team) =>
    columns[team].listed.filter((s) => s.goals > 0).map((s) => ({ team, kind: s.kind, id: s.id, goals: s.goals })),
  );

  return (
    <details className="group mt-4 rounded-xl border border-border" open={startOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 font-bold [&::-webkit-details-marker]:hidden">
        {t('scorersHeading')}
        <span className="ml-auto text-sm font-semibold text-muted">
          {t('assignedLong', { assigned: assigned('blancos') + assigned('color'), total })}
        </span>
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <input type="hidden" name="scorers" value={JSON.stringify(payload)} />
      {/* Cards are half-width on desktop, so the card's own width decides whether teams sit side by side. */}
      <div className="@container px-3 pb-3">
        <div className="grid gap-3 @xl:grid-cols-2">
          {TEAMS.map((team) => {
            const teamName = t(`winner.${team}`);
            const over = score[team] !== null && assigned(team) > score[team]!;
            return (
              <fieldset key={team} className="min-w-0 rounded-lg bg-bg p-3">
                <legend className="sr-only">{t('scorersOf', { team: teamName })}</legend>
                <p aria-hidden className="mb-2 flex items-center gap-2 font-bold">
                  <ShirtIcon filled={team === 'color'} className={`size-5 ${team === 'color' ? 'text-brand' : ''}`} />
                  {teamName}
                  <span className={`ml-auto text-sm tabular-nums ${over ? 'font-bold text-danger' : 'text-muted'}`}>
                    {t('assigned', { assigned: assigned(team), total: score[team] ?? '–' })}
                  </span>
                </p>
                {columns[team].listed.length === 0 ? (
                  <p className="mb-2 text-sm text-muted">{t('noCandidates')}</p>
                ) : (
                  <ul className="flex flex-col">
                    {columns[team].listed.map((s) => {
                      const key = `${s.kind}:${s.id}`;
                      return (
                        <li key={key} className="flex min-h-11 items-center gap-2">
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {s.name}
                            {s.kind === 'guest' && <span className="text-sm text-muted"> ({t('guestTag')})</span>}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-lg font-bold disabled:opacity-40"
                            aria-label={t('removeGoal', { name: s.name })}
                            disabled={s.goals === 0}
                            onClick={() => setGoals(team, key, -1)}
                          >
                            −
                          </button>
                          <span
                            aria-live="polite"
                            className={`w-6 text-center font-extrabold tabular-nums ${s.goals ? '' : 'text-muted'}`}
                          >
                            <span className="sr-only">{t('goalsOf', { name: s.name })}: </span>
                            {s.goals}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-lg font-bold disabled:opacity-40"
                            aria-label={t('addGoal', { name: s.name })}
                            disabled={s.goals >= MAX_GOALS}
                            onClick={() => setGoals(team, key, 1)}
                          >
                            +
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {columns[team].extra.length > 0 && (
                  <select
                    className="input mt-2"
                    aria-label={t('addPlayerTo', { team: teamName })}
                    value=""
                    onChange={(e) => {
                      const option = columns[team].extra.find((o) => o.id === e.target.value);
                      if (option) addPlayer(team, option);
                    }}
                  >
                    <option value="">{t('addPlayer')}</option>
                    {columns[team].extra.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                )}
              </fieldset>
            );
          })}
        </div>
      </div>
      {error && (
        <p role="alert" className="px-3 pb-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </details>
  );
}
