'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { XIcon } from '@/components/icons';
import { Reveal } from '@/components/reveal';
import { EnrolForm } from './enrol-form';

/** Title row (with the player count) and the "＋ Dar de alta" toggle; the form slides open only when asked for. */
export function EnrolSection({ title, count, children }: { title: string; count: number; children?: ReactNode }) {
  const t = useTranslations('admin');
  const [open, setOpen] = useState(false);
  // A new key on every opening gives a blank form (and clears the last share link).
  const [formKey, setFormKey] = useState(0);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open)
      panelRef.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({ preventScroll: true });
  }, [open]);

  const show = () => {
    setFormKey((k) => k + 1);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-2xl font-extrabold tracking-tight">
          {title}
          <span
            aria-hidden
            className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-base font-bold text-muted tabular-nums"
          >
            {count}
          </span>
        </h1>
        <button
          ref={toggleRef}
          type="button"
          className="btn-primary min-h-11 shrink-0 px-4"
          aria-expanded={open}
          aria-controls="enrol-panel"
          aria-label={t('enrol')}
          onClick={() => (open ? close() : show())}
        >
          <span aria-hidden>＋</span>
          {/* Short label on phones keeps the button beside the title. */}
          <span className="sm:hidden">{t('enrolShort')}</span>
          <span className="hidden sm:inline">{t('enrol')}</span>
        </button>
      </div>
      {children}
      <Reveal open={open}>
        <section
          ref={panelRef}
          id="enrol-panel"
          aria-labelledby="enrol-heading"
          className="card mt-4"
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 id="enrol-heading" className="text-xl font-extrabold">
              {t('enrolHeading')}
            </h2>
            <button
              type="button"
              className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-bg"
              aria-label={t('enrolClose')}
              onClick={close}
            >
              <XIcon className="size-5" />
            </button>
          </div>
          <EnrolForm key={formKey} onClose={close} />
        </section>
      </Reveal>
    </>
  );
}
