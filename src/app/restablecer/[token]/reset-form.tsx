'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { resetPasswordAction } from '@/actions/auth';
import { idle } from '@/actions/form-state';
import { Notice, PasswordField, useMessage, useSubmitKeepingValues } from '@/components/form';

export function ResetForm({ token, username }: { token: string; username: string }) {
  const t = useTranslations();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(resetPasswordAction.bind(null, token), idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const err = (field: string) => msg(state.errors?.[field]);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div role="alert">{state.message && <Notice tone="error">{msg(state.message)}</Notice>}</div>
      {/* Lets password managers store the new password against the right account. */}
      <input type="text" name="username" value={username} autoComplete="username" readOnly hidden />
      <PasswordField
        name="password"
        label={t('profile.new')}
        hint={t('errors.password.min')}
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        error={err('password')}
      />
      <PasswordField
        name="confirm"
        label={t('profile.confirm')}
        autoComplete="new-password"
        required
        error={err('confirm')}
      />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {t('reset.submit')}
      </button>
    </form>
  );
}
