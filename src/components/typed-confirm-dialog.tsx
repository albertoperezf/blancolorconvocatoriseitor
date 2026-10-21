'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { idle, type FormState } from '@/actions/form-state';
import { Field, Notice, useMessage, useSubmitKeepingValues } from '@/components/form';

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Hidden inputs sent with the confirmation. */
  fields?: Record<string, string>;
  /** Typed to enable the confirm button (any case); the server must check it again. */
  word: string;
  trigger: string;
  disabled?: boolean;
  title: string;
  body: ReactNode;
  confirm: string;
  /** Close button label, when the default "Cancelar" would read like the action itself. */
  dismiss?: string;
  /** Neutral for actions that aren't destructive but still need care (e.g. they notify everyone). */
  tone?: 'danger' | 'neutral';
  onSuccess?: (state: FormState) => void;
};

/** Destructive action behind a red button and a native modal dialog that only submits once `word` is typed. */
export function TypedConfirmDialog({
  action,
  fields,
  word,
  trigger,
  disabled,
  title,
  body,
  confirm,
  dismiss,
  tone = 'danger',
  onSuccess,
}: Props) {
  const t = useTranslations('confirmDialog');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(action, idle);
  const onSubmit = useSubmitKeepingValues(formAction, state);
  const [typed, setTyped] = useState('');
  const [dismissed, setDismissed] = useState<FormState | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const titleId = useId();
  const bodyId = useId();
  const confirmed = typed.trim().toUpperCase() === word.toUpperCase();
  const error = state.status === 'error' && state !== dismissed ? state : null;

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state.status !== 'success') return;
    dialogRef.current?.close();
    onSuccessRef.current?.(state);
  }, [state]);

  const open = () => {
    setTyped('');
    setDismissed(state);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        className={
          tone === 'danger' ? 'btn mt-4 border-2 border-danger text-danger hover:bg-danger-bg' : 'btn-secondary mt-4'
        }
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={open}
      >
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 text-fg backdrop:bg-black/60 sm:p-6"
      >
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        <p id={bodyId} className="mt-2">
          {body}
        </p>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4" noValidate>
          {Object.entries(fields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div role="alert">{error?.message && <Notice tone="error">{msg(error.message)}</Notice>}</div>
          <Field
            name="confirm"
            label={t('label', { word })}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={msg(error?.errors?.confirm, { word })}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()}>
              {dismiss ?? t('cancel')}
            </button>
            <button
              type="submit"
              className={
                tone === 'danger' ? 'btn bg-danger text-on-status hover:opacity-90 forced-colors:border' : 'btn-primary'
              }
              disabled={!confirmed || pending}
            >
              {confirm}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
