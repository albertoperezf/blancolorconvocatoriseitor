'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { idle, type FormState } from '@/actions/form-state';
import { changePasswordAction, closeOtherSessionsAction, updateTeamAction } from '@/actions/player';
import { Notice, PasswordField, TeamSelect, useMessage, useSubmitKeepingValues } from '@/components/form';

function Result({ state }: { state: FormState }) {
  const msg = useMessage();
  return (
    <div role="status" aria-live="polite">
      {state.status === 'success' && state.message && <Notice tone="success">{msg(state.message)}</Notice>}
    </div>
  );
}

export function TeamForm({ team }: { team: string | null }) {
  const t = useTranslations('profile');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(updateTeamAction, idle);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <TeamSelect label={t('team')} defaultValue={team} error={msg(state.errors?.team)} />
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {t('save')}
      </button>
      <Result state={state} />
    </form>
  );
}

export function ChangePasswordForm({ username }: { username: string }) {
  const t = useTranslations();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(changePasswordAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const formRef = useRef<HTMLFormElement>(null);
  const err = (f: string) => msg(state.errors?.[f]);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="text" name="username" value={username} autoComplete="username" readOnly hidden />
      <PasswordField
        name="current"
        label={t('profile.current')}
        autoComplete="current-password"
        required
        error={err('current')}
      />
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
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {t('profile.save')}
      </button>
      <Result state={state} />
    </form>
  );
}

export function CloseSessionsForm() {
  const t = useTranslations('profile');
  const [state, formAction, pending] = useActionState(closeOtherSessionsAction, idle);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button type="submit" className="btn-secondary self-start" disabled={pending}>
        {t('closeOthers')}
      </button>
      <Result state={state} />
    </form>
  );
}
