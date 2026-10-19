'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useId } from 'react';
import { updateSettingsAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, Notice, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';

type Settings = { weekday: number; kickoffTime: string; venue: string; address: string; rolloverHours: number };

export function SettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations('admin');
  const tProfile = useTranslations('profile');
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(updateSettingsAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction, state);
  const noticeVisible = useAutoHide(state);
  const weekdayId = useId();
  const weekdays = t.raw('weekdays') as string[];
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor={weekdayId} className="label">
          {t('weekday')}
        </label>
        <select id={weekdayId} name="weekday" className="input" defaultValue={settings.weekday}>
          {weekdays.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <Field
        name="kickoffTime"
        type="time"
        label={t('kickoff')}
        defaultValue={settings.kickoffTime}
        required
        error={err('kickoffTime')}
      />
      <Field
        name="venue"
        label={t('venue')}
        defaultValue={settings.venue}
        required
        maxLength={100}
        error={err('venue')}
      />
      <Field
        name="address"
        label={t('address')}
        defaultValue={settings.address}
        autoComplete="street-address"
        required
        maxLength={200}
        error={err('address')}
      />
      <Field
        name="rolloverHours"
        type="number"
        inputMode="numeric"
        min={0}
        max={48}
        label={t('rollover')}
        defaultValue={settings.rolloverHours}
        required
        error={err('rolloverHours')}
      />
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {tProfile('save')}
      </button>
      <div role="status" aria-live="polite">
        {state.status === 'success' && noticeVisible && <Notice tone="success">{msg(state.message)}</Notice>}
      </div>
    </form>
  );
}
