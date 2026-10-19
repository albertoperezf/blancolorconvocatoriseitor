'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { saveResultAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';
import { Reveal } from '@/components/reveal';
import type { Team } from '@/lib/db/schema';
import type { ScorerColumn } from '@/lib/match/goals';
import { ScorersEditor } from './scorers-editor';

type Props = {
  matchId: string;
  legend: string;
  blancos: number | null;
  color: number | null;
  scorers: Record<Team, ScorerColumn>;
  defaultOpen?: boolean;
};

const asGoals = (v: string) => (/^\d{1,2}$/.test(v.trim()) ? Number(v) : null);

/** Folded behind "Editar resultado" so the list stays short; the newest match without a result starts open. */
export function ResultForm({ matchId, legend, blancos, color, scorers, defaultOpen = false }: Props) {
  const t = useTranslations('results');
  const msg = useMessage();
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState(saveResultAction.bind(null, matchId), idle);
  const onSubmit = useSubmitKeepingValues(formAction, state);
  const noticeVisible = useAutoHide(state);
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);
  const [score, setScore] = useState({ blancos: String(blancos ?? ''), color: String(color ?? '') });

  return (
    <div className="mt-4 border-t border-border pt-2">
      <button
        type="button"
        className="btn-ghost group/edit min-h-11"
        aria-expanded={open}
        aria-controls={`result-${matchId}`}
        onClick={() => setOpen((o) => !o)}
      >
        {blancos === null || color === null ? t('enter') : t('edit')}
        <span aria-hidden className="text-muted transition-transform group-aria-expanded/edit:rotate-180">
          ▾
        </span>
      </button>
      <Reveal open={open}>
        <form id={`result-${matchId}`} onSubmit={onSubmit} className="pt-2" noValidate>
          <fieldset>
            <legend className="sr-only">{legend}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="blancos"
                label={t('blancosGoals')}
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                required
                value={score.blancos}
                onChange={(e) => setScore((s) => ({ ...s, blancos: e.target.value }))}
                error={err('blancos')}
              />
              <Field
                name="color"
                label={t('colorGoals')}
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                required
                value={score.color}
                onChange={(e) => setScore((s) => ({ ...s, color: e.target.value }))}
                error={err('color')}
              />
            </div>
          </fieldset>
          <ScorersEditor
            initial={scorers}
            score={{ blancos: asGoals(score.blancos), color: asGoals(score.color) }}
            error={err('scorers')}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              {t('save')}
            </button>
            <p role="status" aria-live="polite" className="text-sm font-semibold">
              {state.status === 'success' && noticeVisible && <span className="text-going">{msg(state.message)}</span>}
              {state.status === 'error' && state.message && <span className="text-danger">{msg(state.message)}</span>}
            </p>
          </div>
        </form>
      </Reveal>
    </div>
  );
}
