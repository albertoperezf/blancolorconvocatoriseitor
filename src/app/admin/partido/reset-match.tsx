'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { resetMatchAction } from '@/actions/admin';
import type { FormState } from '@/actions/form-state';
import { Notice } from '@/components/form';
import { TypedConfirmDialog } from '@/components/typed-confirm-dialog';
import { RESET_WORD } from '@/lib/match/reset-word';

type Props = {
  matchId: string;
  day: string;
  time: string;
  going: number;
  maybe: number;
  notGoing: number;
  guests: number;
  started: boolean;
};

/** "Reiniciar convocatoria": only submits once REINICIAR is typed in the dialog. */
export function ResetMatch({ matchId, day, time, going, maybe, notGoing, guests, started }: Props) {
  const t = useTranslations('admin.reset');
  const format = useFormatter();
  const [done, setDone] = useState<FormState | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const answers = going + maybe + notGoing;
  const empty = answers + guests === 0;

  const what = (a: number, g: number) =>
    format.list([...(a ? [t('answersCount', { count: a })] : []), ...(g ? [t('guestsCount', { count: g })] : [])]);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  return (
    <>
      <h2 id="reset-heading" className="text-xl font-extrabold">
        {t('heading')}
      </h2>
      <p className="mt-1 text-muted">
        {day} · {time}
      </p>
      <p className="mt-2 font-semibold">
        {empty ? t('empty') : t('summary', { answers, going, maybe, notGoing, guests })}
      </p>
      <p className="mt-2 text-sm text-muted">{started ? t('started') : t('intro')}</p>
      <TypedConfirmDialog
        action={resetMatchAction}
        fields={{ matchId }}
        word={RESET_WORD}
        trigger={t('open')}
        disabled={empty || started}
        title={t('confirmTitle', { day: day.charAt(0).toLowerCase() + day.slice(1) })}
        body={t('confirmBody', { total: answers + guests, what: what(answers, guests) })}
        confirm={t('confirm')}
        onSuccess={setDone}
      />
      <div role="status">
        {done?.data && (
          <div ref={doneRef} tabIndex={-1} className="mt-4 outline-offset-4">
            <Notice tone="success">
              {t('done', {
                total: Number(done.data.answers) + Number(done.data.guests),
                what: what(Number(done.data.answers), Number(done.data.guests)),
              })}
            </Notice>
          </div>
        )}
      </div>
    </>
  );
}
