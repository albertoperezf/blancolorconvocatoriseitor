'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { cancelMatchAction, restoreMatchAction } from '@/actions/admin';
import { Field, Notice, useMessage } from '@/components/form';
import { BanIcon } from '@/components/icons';
import { TypedConfirmDialog } from '@/components/typed-confirm-dialog';
import { CANCEL_REASONS, CANCEL_WORD, RESTORE_WORD, type CancelReason } from '@/lib/match/reset-word';

type When = { id: string; day: string; time: string };
type Props = { open: When; cancelled?: When & { reason: string; by: string | null } };

const lower = (day: string) => day.charAt(0).toLowerCase() + day.slice(1);

/** "Cancelar partido" with a required reason, or "Reactivar partido" while this week's match is called off. */
export function CancelMatch({ open, cancelled }: Props) {
  const t = useTranslations('admin.cancel');
  const msg = useMessage();
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const reasonText = reason === 'other' ? note.trim() : reason ? t(`reasons.${reason}`) : '';
  const valid = reason !== null && (reason !== 'other' || reasonText.length >= 3);
  const isCancelled = Boolean(cancelled);

  // The card switches mode once the page refreshes, so focus the notice again in the new one.
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done, isCancelled]);

  const notice = (
    <div role="status">
      {done && (
        <div ref={doneRef} tabIndex={-1} className="mt-4 outline-offset-4">
          <Notice tone="success">{msg(done)}</Notice>
        </div>
      )}
    </div>
  );

  if (cancelled) {
    return (
      <>
        <h2 id="cancel-heading" className="flex items-center gap-2 text-xl font-extrabold">
          <BanIcon className="size-5 shrink-0 text-danger" />
          {t('cancelledTitle')}
        </h2>
        <p className="mt-1 text-muted">
          {cancelled.day} · {cancelled.time}
        </p>
        <p className="mt-2 font-semibold">{t('reasonValue', { reason: cancelled.reason })}</p>
        {cancelled.by && <p className="mt-1 text-sm text-muted">{t('cancelledBy', { name: cancelled.by })}</p>}
        <p className="mt-2 text-sm text-muted">{t('restoreIntro')}</p>
        <TypedConfirmDialog
          action={restoreMatchAction}
          fields={{ matchId: cancelled.id }}
          word={RESTORE_WORD}
          tone="neutral"
          trigger={t('restoreOpen')}
          title={t('restoreTitle', { day: lower(cancelled.day) })}
          body={t('restoreBody')}
          confirm={t('restoreConfirm')}
          onSuccess={(s) => setDone(s.message ?? null)}
        />
        {notice}
      </>
    );
  }

  return (
    <>
      <h2 id="cancel-heading" className="text-xl font-extrabold">
        {t('heading')}
      </h2>
      <p className="mt-1 text-muted">
        {open.day} · {open.time}
      </p>
      <p className="mt-2 text-sm text-muted">{t('intro')}</p>
      <fieldset className="mt-4">
        <legend className="label">{t('reasonLegend')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CANCEL_REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 has-[:checked]:border-danger has-[:checked]:bg-danger-bg"
            >
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-5 shrink-0 accent-danger"
              />
              {t(`reasons.${r}`)}
            </label>
          ))}
        </div>
      </fieldset>
      {reason === 'other' && (
        <div className="mt-3">
          <Field
            name="cancel-note"
            label={t('note')}
            maxLength={100}
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}
      <TypedConfirmDialog
        action={cancelMatchAction}
        fields={{ matchId: open.id, reason: reason ?? '', note }}
        word={CANCEL_WORD}
        trigger={t('open')}
        disabled={!valid}
        title={t('confirmTitle', { day: lower(open.day) })}
        body={t('confirmBody', { reason: reasonText })}
        confirm={t('confirm')}
        dismiss={t('back')}
        onSuccess={(s) => {
          setReason(null);
          setNote('');
          setDone(s.message ?? null);
        }}
      />
      {notice}
    </>
  );
}
