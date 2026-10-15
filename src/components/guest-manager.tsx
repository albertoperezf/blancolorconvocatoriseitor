'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { addGuestAction, removeGuestAction } from '@/actions/player';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useMessage } from './form';
import { XIcon } from './icons';

export function GuestManager({ guests }: { guests: { id: string; name: string }[] }) {
  const t = useTranslations('guests');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(addGuestAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeVisible = useAutoHide(state);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <section aria-labelledby="guests-heading" className="card mt-6">
      <h2 id="guests-heading" className="text-xl font-extrabold">
        {t('heading')}
      </h2>
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
      <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Field
            name="name"
            label={t('label')}
            hint={t('hint')}
            autoComplete="off"
            required
            minLength={2}
            maxLength={30}
            error={state.status === 'error' ? msg(state.errors?.name) : undefined}
          />
        </div>
        <button type="submit" className="btn-primary sm:mt-[3.25rem]" disabled={pending}>
          {t('add')}
        </button>
      </form>
      <div role="status" aria-live="polite" className="mt-2 min-h-6 text-sm">
        {state.status === 'success' && noticeVisible && msg(state.message, state.data)}
      </div>
    </section>
  );
}
