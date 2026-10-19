'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef } from 'react';
import { createResetLinkAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Notice, useFocusAfterSubmit, useMessage } from '@/components/form';
import { ShareLink } from '../share-link';

export function ResetLinkPanel({ userId }: { userId: string }) {
  const t = useTranslations('admin');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(createResetLinkAction.bind(null, userId), idle);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusAfterSubmit(formRef, state);

  return (
    <form ref={formRef} action={formAction}>
      <button type="submit" className="btn-secondary" disabled={pending}>
        {t('resetCreate')}
      </button>
      <div role="status" aria-live="polite">
        {state.status === 'success' && state.data && <ShareLink name={state.data.name} url={state.data.url} />}
        {state.status === 'error' && <Notice tone="error">{msg(state.message)}</Notice>}
      </div>
    </form>
  );
}
