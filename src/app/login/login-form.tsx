'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { loginAction } from '@/actions/auth';
import { idle } from '@/actions/form-state';
import { Field, Notice, PasswordField, useSubmitKeepingValues } from '@/components/form';

export function LoginForm() {
  const t = useTranslations('login');
  const [state, formAction, pending] = useActionState(loginAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const formRef = useRef<HTMLFormElement>(null);
  const error = state.message === 'login.invalid' ? t('invalid') : undefined;

  // The username is usually right; only the password is cleared for the retry.
  useEffect(() => {
    if (state.status !== 'error') return;
    const password = formRef.current?.elements.namedItem('password');
    if (password instanceof HTMLInputElement) {
      password.value = '';
      password.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div role="alert" aria-live="assertive">
        {error && <Notice tone="error">{error}</Notice>}
      </div>
      <Field
        name="username"
        label={t('username')}
        autoComplete="username"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={30}
      />
      <PasswordField name="password" label={t('password')} autoComplete="current-password" required maxLength={128} />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {t('submit')}
      </button>
      <Link href="/recuperar" className="btn-link self-start">
        {t('forgot')}
      </Link>
    </form>
  );
}
