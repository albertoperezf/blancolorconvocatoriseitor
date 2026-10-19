'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { addGuestAction, removeGuestAction } from '@/actions/player';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useFocusAfterSubmit, useMessage } from './form';
import { CheckIcon, XIcon } from './icons';
import { Reveal } from './reveal';

/** Current guests as chips; the add form stays folded behind "＋ Añadir fichaje" until needed. */
export function GuestManager({ guests }: { guests: { id: string; name: string }[] }) {
  const t = useTranslations('guests');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(addGuestAction, idle);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const noticeVisible = useAutoHide(state, 5_000);

  // By name: React puts hidden server-action inputs first in the form.
  const focusName = () =>
    formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });

  useEffect(() => {
    if (open) focusName();
  }, [open]);

  // Stays open after adding, ready for the next guest.
  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      focusName();
    }
  }, [state]);
  useFocusAfterSubmit(formRef, state);

  const close = () => {
    // Closing discards what was typed and any validation error from the last attempt.
    formRef.current?.reset();
    setDismissed(state);
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <section aria-labelledby="guests-heading" className="card mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="guests-heading" className="text-xl font-extrabold">
          {t('heading')}
        </h2>
        <button
          ref={toggleRef}
          type="button"
          className="btn-secondary min-h-11 shrink-0 px-4"
          aria-expanded={open}
          aria-controls="guest-form"
          aria-label={t('addToggle')}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <span aria-hidden>＋</span>
          <span className="sm:hidden">{t('add')}</span>
          <span className="hidden sm:inline">{t('addToggle')}</span>
        </button>
      </div>
      {guests.length === 0 ? (
        <p className="mt-2 text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {guests.map((g) => (
            <li key={g.id} className="inline-flex items-center gap-1 rounded-xl bg-bg py-1 pr-1 pl-3 font-medium">
              {g.name}
              <form action={removeGuestAction}>
                <input type="hidden" name="id" value={g.id} />
                <button
                  type="submit"
                  className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface"
                  aria-label={t('remove', { name: g.name })}
                >
                  <XIcon className="size-5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <Reveal open={open}>
        <form
          ref={formRef}
          id="guest-form"
          action={formAction}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <Field
              name="name"
              label={t('label')}
              hint={t('hint')}
              hintInline
              autoComplete="off"
              required
              minLength={2}
              maxLength={30}
              error={state.status === 'error' && state !== dismissed ? msg(state.errors?.name) : undefined}
            />
          </div>
          {/* Offset = label row (1.5rem) + its margin (0.625rem), so the buttons line up with the input. */}
          <div className="flex gap-2 sm:mt-[2.125rem]">
            <button type="submit" className="btn-primary" disabled={pending}>
              {t('add')}
            </button>
            <button type="button" className="btn-secondary" onClick={close}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </Reveal>
      <div role="status" aria-live="polite" className="mt-3 empty:hidden">
        {state.status === 'success' && noticeVisible && (
          <p className="inline-flex items-center gap-2 rounded-xl bg-success-bg px-3 py-2 font-semibold text-going">
            <CheckIcon className="size-5 shrink-0" />
            {msg(state.message, state.data)}
          </p>
        )}
      </div>
    </section>
  );
}
