'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { sendTestPushAction } from '@/actions/push';
import { useAutoHide } from '@/components/form';
import { usePush } from './use-push';

/** "Notificaciones" box in Perfil: turn notifications on/off, iPhone steps, and an admin test send. */
export function PushSettings({ publicKey, isAdmin }: { publicKey: string | null; isAdmin: boolean }) {
  const t = useTranslations('push');
  const { state, busy, failed, enable, disable } = usePush(publicKey);
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ status: string } | null>(null);
  const testVisible = useAutoHide(testResult);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">{t('intro')}</p>
      <div role="status" aria-live="polite">
        {state === 'on' && <p className="font-semibold text-going">{t('stateOn')}</p>}
        {state === 'denied' && <p className="text-muted">{t('stateDenied')}</p>}
        {state === 'unsupported' && <p className="text-muted">{t('stateUnsupported')}</p>}
        {failed && <p className="font-semibold text-danger">{t('error')}</p>}
      </div>
      {state === 'ios-install' && <IosSteps />}
      {state === 'off' && (
        <button type="button" className="btn-primary self-start" onClick={enable} disabled={busy}>
          {t('enable')}
        </button>
      )}
      {state === 'on' && (
        <button type="button" className="btn-secondary self-start" onClick={disable} disabled={busy}>
          {t('disable')}
        </button>
      )}
      {isAdmin && state === 'on' && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <button
            type="button"
            className="btn-link min-h-11"
            disabled={testing}
            onClick={() => startTest(async () => setTestResult(await sendTestPushAction()))}
          >
            {t('test')}
          </button>
          <span role="status" aria-live="polite" className="text-sm text-muted">
            {testResult && testVisible && t(`testResult.${testResult.status}`)}
          </span>
        </div>
      )}
    </div>
  );
}

export function IosSteps() {
  const t = useTranslations('push');
  return (
    <div>
      <p className="font-semibold">{t('iosTitle')}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
        <li>{t('iosStep1')}</li>
        <li>{t('iosStep2')}</li>
        <li>{t('iosStep3')}</li>
      </ol>
    </div>
  );
}
