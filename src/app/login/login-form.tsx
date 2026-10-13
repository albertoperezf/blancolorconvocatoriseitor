'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { loginAction } from '@/actions/auth';
import { idle } from '@/actions/form-state';
import { Field, Notice, PasswordField } from '@/components/form';

export function LoginForm() {
  const t = useTranslations('login');
  const [state, formAction, pending] = useActionState(loginAction, idle);
  const error = state.message === 'login.invalid' ? t('invalid') : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
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
