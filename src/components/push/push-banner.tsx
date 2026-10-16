'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { XIcon } from '@/components/icons';
import { IosSteps } from './push-settings';
import { usePush } from './use-push';

const DISMISSED_KEY = 'avisos-banner-cerrado';

/** Nudge on Mi partido to turn on reminders; hidden once enabled, refused or dismissed. */
export function PushBanner({ publicKey }: { publicKey: string | null }) {
  if (!publicKey) return null;
  return <Banner publicKey={publicKey} />;
}

function Banner({ publicKey }: { publicKey: string }) {
  const t = useTranslations('push');
  const { state, busy, failed, enable } = usePush(publicKey);
  // Safe to read during render: nothing is shown until usePush resolves on the client anyway.
  const [dismissed, setDismissed] = useState(
    () => typeof window === 'undefined' || localStorage.getItem(DISMISSED_KEY) === '1',
  );

  if (dismissed || (state !== 'off' && state !== 'ios-install')) return null;
  const close = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <section aria-label={t('bannerLabel')} className="card mt-4 flex items-start gap-3 border-l-4 border-l-brand">
      <div className="flex-1">
        <p className="font-semibold">{t('bannerText')}</p>
        {failed && <p className="mt-1 text-sm font-semibold text-danger">{t('error')}</p>}
        <div className="mt-2">
          {state === 'off' ? (
            <button type="button" className="btn-primary min-h-11 px-4 text-sm" onClick={enable} disabled={busy}>
              {t('enable')}
            </button>
          ) : (
            // iPhone: install steps right here, so nobody has to go looking for them in Perfil.
            <IosSteps here="banner" />
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t('bannerClose')}
        className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-bg"
      >
        <XIcon className="size-5" />
      </button>
    </section>
  );
}
