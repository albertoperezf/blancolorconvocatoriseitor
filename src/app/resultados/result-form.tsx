'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { saveResultAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';
import type { Team } from '@/lib/db/schema';
import type { ScorerColumn } from '@/lib/match/goals';
import { ScorersEditor } from './scorers-editor';

type Props = {
  matchId: string;
  legend: string;
  blancos: number | null;
  color: number | null;
  scorers: Record<Team, ScorerColumn>;
};

const asGoals = (v: string) => (/^\d{1,2}$/.test(v.trim()) ? Number(v) : null);

export function ResultForm({ matchId, legend, blancos, color, scorers }: Props) {
  const t = useTranslations('results');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(saveResultAction.bind(null, matchId), idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const noticeVisible = useAutoHide(state);
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);
  const [score, setScore] = useState({ blancos: String(blancos ?? ''), color: String(color ?? '') });

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-border pt-4" noValidate>
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
  );
}
