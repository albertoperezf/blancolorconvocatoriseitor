'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useId, useState } from 'react';
import { updateUserAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, Notice, TeamSelect, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';

type User = {
  id: string;
  displayName: string;
  team: string | null;
  role: string;
  longTermAbsence: boolean;
  absenceNote: string | null;
  active: boolean;
};

export function UserForm({ user, isSelf }: { user: User; isSelf: boolean }) {
  const t = useTranslations('admin');
  const tProfile = useTranslations('profile');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(updateUserAction.bind(null, user.id), idle);
  const onSubmit = useSubmitKeepingValues(formAction);
  const noticeVisible = useAutoHide(state);
  const [absent, setAbsent] = useState(user.longTermAbsence);
  const roleId = useId();
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);
  const check = 'flex min-h-11 cursor-pointer items-center gap-3 font-semibold';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        name="displayName"
        label={t('displayName')}
        defaultValue={user.displayName}
        required
        maxLength={40}
        error={err('displayName')}
      />
      <TeamSelect label={tProfile('team')} defaultValue={user.team} allowNone error={err('team')} />
      <div>
        <label htmlFor={roleId} className="label">
          {t('role')}
        </label>
        <select id={roleId} name="role" className="input" defaultValue={user.role} disabled={isSelf}>
          <option value="player">{t('roles.player')}</option>
          <option value="admin">{t('roles.admin')}</option>
        </select>
        {/* Disabled controls aren't submitted; keep the value so admins can't demote themselves by accident. */}
        {isSelf && <input type="hidden" name="role" value={user.role} />}
      </div>
      <label className={check}>
        <input
          type="checkbox"
          name="longTermAbsence"
          className="size-6"
          checked={absent}
          onChange={(e) => setAbsent(e.target.checked)}
        />
        {t('longTermAbsence')}
      </label>
      {absent && (
        <Field name="absenceNote" label={t('absenceNote')} defaultValue={user.absenceNote ?? ''} maxLength={200} />
      )}
      <label className={check}>
        <input type="checkbox" name="active" className="size-6" defaultChecked={user.active} disabled={isSelf} />
        {t('active')}
      </label>
      {isSelf && <input type="hidden" name="active" value="on" />}
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {tProfile('save')}
      </button>
      <div role="status" aria-live="polite">
        {state.status === 'success' && noticeVisible && <Notice tone="success">{msg(state.message)}</Notice>}
        {state.status === 'error' && state.message && <Notice tone="error">{msg(state.message)}</Notice>}
      </div>
    </form>
  );
}
