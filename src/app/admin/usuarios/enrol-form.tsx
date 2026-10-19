'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef } from 'react';
import { enrolUserAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, Notice, TeamSelect, useFocusAfterSubmit, useMessage } from '@/components/form';
import { ShareLink } from './share-link';

export function EnrolForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations('admin');
  const tProfile = useTranslations('profile');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(enrolUserAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  const roleId = useId();
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);
  useFocusAfterSubmit(formRef, state);

  return (
    <>
      <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field
          name="username"
          label={t('username')}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          maxLength={30}
          error={err('username')}
        />
        <Field
          name="displayName"
          label={t('displayName')}
          autoComplete="off"
          required
          maxLength={40}
          error={err('displayName')}
        />
        <TeamSelect label={tProfile('team')} allowNone error={err('team')} />
        <div>
          <label htmlFor={roleId} className="label">
            {t('role')}
          </label>
          <select id={roleId} name="role" className="input" defaultValue="player">
            <option value="player">{t('roles.player')}</option>
            <option value="editor">{t('roles.editor')}</option>
            <option value="admin">{t('roles.admin')}</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {t('enrol')}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('enrolCancel')}
          </button>
        </div>
      </form>
      <div role="status" aria-live="polite" className="mt-3">
        {state.status === 'success' && state.data && (
          <>
            <Notice tone="success">{t('enrolled', { name: state.data.name })}</Notice>
            <ShareLink name={state.data.name} url={state.data.url} />
            <button type="button" className="btn-primary mt-3" onClick={onClose}>
              {t('enrolDone')}
            </button>
          </>
        )}
      </div>
    </>
  );
}
