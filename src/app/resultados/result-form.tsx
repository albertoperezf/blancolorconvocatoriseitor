'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { saveResultAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';

type Props = { matchId: string; legend: string; blancos: number | null; color: number | null };

export function ResultForm({ matchId, legend, blancos, color }: Props) {
  const t = useTranslations('results');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(saveResultAction.bind(null, matchId), idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const noticeVisible = useAutoHide(state);
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);

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
            defaultValue={blancos ?? ''}
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
            defaultValue={color ?? ''}
            error={err('color')}
          />
        </div>
      </fieldset>
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
