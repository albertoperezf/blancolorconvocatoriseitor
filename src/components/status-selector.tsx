'use client';

import { useTranslations } from 'next-intl';
import { useOptimistic, useState, useTransition } from 'react';
import type { Decision } from '@/lib/db/schema';
import { CheckIcon, QuestionIcon, XIcon } from './icons';

type SaveResult = { ok: boolean; error?: string };
type Props = {
  initial: Decision | null;
  onSave: (decision: Decision | null) => Promise<SaveResult>;
};

// Selected colours come from React state, not `peer-checked:`; iOS Safari could leave stale highlights.
const OPTIONS: { value: Decision; Icon: typeof CheckIcon; checked: string }[] = [
  { value: 'going', Icon: CheckIcon, checked: 'bg-going border-going text-on-status' },
  { value: 'maybe', Icon: QuestionIcon, checked: 'bg-maybe border-maybe text-on-status' },
  { value: 'not_going', Icon: XIcon, checked: 'bg-notgoing border-notgoing text-on-status' },
];

export function StatusSelector({ initial, onSave }: Props) {
  const t = useTranslations('status');
  const [saved, setSaved] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; undo?: Decision | null; error?: boolean } | null>(null);

  function save(next: Decision | null, previous: Decision | null, offerUndo: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await onSave(next);
      if (!result.ok) {
        setNotice({ text: t('error'), error: true });
        return;
      }
      setSaved(next);
      setNotice({
        text: next ? t('saved', { status: t(next) }) : t('cleared'),
        undo: offerUndo ? previous : undefined,
      });
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_0_0/0.08)] md:static md:mt-6 md:rounded-[var(--radius-card)] md:border md:p-6 md:shadow-none">
      <fieldset id="tu-respuesta" disabled={pending} aria-busy={pending}>
        <legend className="mb-2 font-extrabold">{t('legend')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map(({ value, Icon, checked }) => (
            <label key={value} className="relative">
              <input
                type="radio"
                name="decision"
                value={value}
                className="peer sr-only"
                checked={optimistic === value}
                onChange={() => save(value, saved, true)}
              />
              <span
                className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2 text-sm font-extrabold tracking-wide peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand sm:flex-row sm:gap-2 sm:text-base ${optimistic === value ? checked : 'border-border bg-surface'}`}
              >
                <Icon className="size-5" />
                {t(value)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-2 flex min-h-8 items-center gap-3 text-sm">
        {notice ? (
          <>
            <span className={notice.error ? 'font-semibold text-danger' : ''}>{notice.text}</span>
            {notice.undo !== undefined && (
              <button
                type="button"
                className="btn-link"
                onClick={() => save(notice.undo ?? null, saved, false)}
                disabled={pending}
              >
                {t('undo')}
              </button>
            )}
          </>
        ) : (
          optimistic === null && <span className="text-muted">{t('none')}</span>
        )}
      </div>
    </div>
  );
}
