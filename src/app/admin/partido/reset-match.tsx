'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { resetMatchAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, Notice, useMessage, useSubmitKeepingValues } from '@/components/form';
import { RESET_WORD } from '@/lib/match/reset-word';

type Props = {
  matchId: string;
  day: string;
  time: string;
  going: number;
  maybe: number;
  notGoing: number;
  guests: number;
  started: boolean;
};

/** "Reiniciar convocatoria": a native modal dialog that only submits once REINICIAR is typed. */
export function ResetMatch({ matchId, day, time, going, maybe, notGoing, guests, started }: Props) {
  const t = useTranslations('admin.reset');
  const format = useFormatter();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(resetMatchAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction, state);
  const [typed, setTyped] = useState('');
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const answers = going + maybe + notGoing;
  const empty = answers + guests === 0;
  const confirmed = typed.trim().toUpperCase() === RESET_WORD;
  const error = state.status === 'error' && state !== dismissed ? state : null;

  const what = (a: number, g: number) =>
    format.list([...(a ? [t('answersCount', { count: a })] : []), ...(g ? [t('guestsCount', { count: g })] : [])]);

  useEffect(() => {
    if (state.status !== 'success') return;
    dialogRef.current?.close();
    doneRef.current?.focus();
  }, [state]);

  const open = () => {
    setTyped('');
    setDismissed(state);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <h2 id="reset-heading" className="text-xl font-extrabold">
        {t('heading')}
      </h2>
      <p className="mt-1 text-muted">
        {day} · {time}
      </p>
      <p className="mt-2 font-semibold">
        {empty ? t('empty') : t('summary', { answers, going, maybe, notGoing, guests })}
      </p>
      <p className="mt-2 text-sm text-muted">{started ? t('started') : t('intro')}</p>
      <button
        type="button"
        className="btn mt-4 border-2 border-danger text-danger hover:bg-danger-bg"
        aria-haspopup="dialog"
        disabled={empty || started}
        onClick={open}
      >
        {t('open')}
      </button>
      <div role="status">
        {state.status === 'success' && state.data && (
          <div ref={doneRef} tabIndex={-1} className="mt-4 outline-offset-4">
            <Notice tone="success">
              {t('done', {
                total: Number(state.data.answers) + Number(state.data.guests),
                what: what(Number(state.data.answers), Number(state.data.guests)),
              })}
            </Notice>
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 text-fg backdrop:bg-black/60 sm:p-6"
      >
        <h2 id={titleId} className="text-xl font-extrabold">
          {t('confirmTitle', { day: day.charAt(0).toLowerCase() + day.slice(1) })}
        </h2>
        <p id={bodyId} className="mt-2">
          {t('confirmBody', { total: answers + guests, what: what(answers, guests) })}
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4" noValidate>
          <input type="hidden" name="matchId" value={matchId} />
          <div role="alert">{error?.message && <Notice tone="error">{msg(error.message)}</Notice>}</div>
          <Field
            name="confirm"
            label={t('confirmLabel', { word: RESET_WORD })}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={msg(error?.errors?.confirm)}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()}>
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn bg-danger text-on-status hover:opacity-90 forced-colors:border"
              disabled={!confirmed || pending}
            >
              {t('confirm')}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
