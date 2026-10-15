'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { requestResetAction } from '@/actions/auth';
import { idle } from '@/actions/form-state';
import { Field, Notice, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';

export function RecoverForm() {
  const t = useTranslations();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(requestResetAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const noticeVisible = useAutoHide(state);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div role="status" aria-live="polite">
        {state.status === 'success' && noticeVisible && <Notice tone="success">{t('recover.sent')}</Notice>}
      </div>
      <Field
        name="username"
        label={t('login.username')}
        autoComplete="username"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={30}
        error={state.status === 'error' ? msg(state.errors?.username) : undefined}
      />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {t('recover.submit')}
      </button>
      <Link href="/login" className="btn-link self-start">
        {t('recover.back')}
      </Link>
    </form>
  );
}
