'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef } from 'react';
import { sendContactAction } from '@/actions/contact';
import { idle } from '@/actions/form-state';
import { Field, Notice, useMessage, useSubmitKeepingValues } from '@/components/form';

export function ContactForm() {
  const t = useTranslations('contact');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(sendContactAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const formRef = useRef<HTMLFormElement>(null);
  const messageId = useId();
  const errors = state.status === 'error' ? state.errors : undefined;
  const messageError = msg(errors?.message);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field name="name" label={t('name')} autoComplete="name" required maxLength={60} error={msg(errors?.name)} />
      <Field
        name="email"
        type="email"
        label={t('email')}
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        required
        maxLength={120}
        error={msg(errors?.email)}
      />
      <div>
        <label htmlFor={messageId} className="label">
          {t('message')}
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={5}
          required
          maxLength={1000}
          className="input min-h-32 py-3"
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? `${messageId}-error` : undefined}
        />
        {messageError && (
          <p id={`${messageId}-error`} className="mt-1 text-sm font-semibold text-danger">
            {messageError}
          </p>
        )}
      </div>
      {/* Honeypot for bots; hidden from people and assistive tech. */}
      <div aria-hidden className="hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {t('submit')}
      </button>
      {/* Always rendered so screen readers announce the notice; -mt-4 cancels the gap while it's empty. */}
      <div role="status" aria-live="polite" className="-mt-4">
        {state.status === 'success' && (
          <div className="mt-4">
            <Notice tone="success">{t('sent')}</Notice>
          </div>
        )}
      </div>
    </form>
  );
}
