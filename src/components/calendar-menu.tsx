'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarPlusIcon } from './icons';

type Props = {
  googleUrl: string;
  labels: { trigger: string; ics: string; google: string; opensNewTab: string };
};

// Disclosure (not an ARIA menu): plain links inside, closes on outside click or Escape.
export function CalendarMenu({ googleUrl, labels }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const item = 'flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-bg';
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost"
      >
        <CalendarPlusIcon className="size-5 text-brand" />
        {labels.trigger}
        <span aria-hidden className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      <ul
        id={listId}
        hidden={!open}
        className="absolute top-full left-0 z-20 mt-1 min-w-56 rounded-xl border border-border bg-surface p-1 shadow-lg"
      >
        <li>
          <a href="/api/calendario" download className={item} onClick={() => setOpen(false)}>
            {labels.ics}
          </a>
        </li>
        <li>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
            {labels.google}
            <span className="sr-only"> ({labels.opensNewTab})</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
