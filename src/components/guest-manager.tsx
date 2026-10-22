'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { addGuestAction, removeGuestAction } from '@/actions/player';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useFocusAfterSubmit, useMessage } from './form';
import { CheckIcon, XIcon } from './icons';
import { Reveal } from './reveal';

const REVEAL_MS = 320;
const GAP = 12;
// Smaller changes are browser bars collapsing, not the keyboard.
const KEYBOARD_MIN = 120;

/** Height the on-screen keyboard covers: iOS shrinks only the visual viewport, not the page. */
function keyboardHeight() {
  const vv = window.visualViewport;
  const covered = vv ? window.innerHeight - vv.height : 0;
  return covered > KEYBOARD_MIN ? Math.round(covered) : 0;
}

/** If `el` isn't fully visible between the header and whatever covers the bottom, scrolls it to just below the header. */
function keepInView(el: HTMLElement, smooth: boolean) {
  const vv = window.visualViewport;
  const viewTop = vv?.offsetTop ?? 0;
  const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
  // The fixed answer bar on phones; behind the keyboard it no longer covers anything.
  const bar = document.querySelector('#tu-respuesta')?.closest<HTMLElement>('.fixed');
  const barTop = bar && getComputedStyle(bar).position === 'fixed' ? bar.getBoundingClientRect().top : Infinity;
  const top = Math.max(viewTop, header) + GAP;
  const bottom = Math.min(viewBottom, barTop) - GAP;
  const rect = el.getBoundingClientRect();
  if (rect.top >= top && rect.bottom <= bottom) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollBy({ top: rect.top - top, behavior: smooth && !reduce ? 'smooth' : 'auto' });
}

/** Current guests as chips; the add form stays folded behind "＋ Añadir fichaje" until needed. */
export function GuestManager({ guests }: { guests: { id: string; name: string }[] }) {
  const t = useTranslations('guests');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(addGuestAction, idle);
  const [open, setOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(0);
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const noticeVisible = useAutoHide(state, 5_000);

  // By name: React puts hidden server-action inputs first in the form.
  const focusName = () =>
    formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });

  useEffect(() => {
    if (!open) return;
    focusName();
    const vv = window.visualViewport;
    let last = -1;
    // Once the form has slid open, and whenever the keyboard appears, changes height or goes away.
    const sync = () => {
      const kb = keyboardHeight();
      if (last >= 0 && Math.abs(kb - last) < KEYBOARD_MIN / 2) return;
      last = kb;
      setKeyboard(kb);
      // Two frames: after React has added the room below the form.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => formRef.current && keepInView(formRef.current, kb === 0)),
      );
    };
    const timer = setTimeout(sync, REVEAL_MS);
    vv?.addEventListener('resize', sync);
    return () => {
      clearTimeout(timer);
      vv?.removeEventListener('resize', sync);
    };
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
    <>
      <section aria-labelledby="guests-heading" className="card mt-4 md:mt-6">
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
      {/* Sits behind the keyboard: room for the page to scroll the form above it near the end of the page. */}
      {open && keyboard > 0 && <div aria-hidden style={{ height: keyboard }} />}
    </>
  );
}
