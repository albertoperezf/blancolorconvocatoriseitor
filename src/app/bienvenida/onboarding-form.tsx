'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { completeOnboardingAction } from '@/actions/auth';
import { idle } from '@/actions/form-state';
import { PasswordField, TeamSelect, useMessage } from '@/components/form';

export function OnboardingForm({ needsPassword, team }: { needsPassword: boolean; team: string | null }) {
  const t = useTranslations();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(completeOnboardingAction, idle);
  const err = (field: string) => msg(state.errors?.[field]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <TeamSelect label={t('profile.team')} defaultValue={team} error={err('team')} />
      {needsPassword && (
        <>
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
        </>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {t('welcome.submit')}
      </button>
    </form>
  );
}
