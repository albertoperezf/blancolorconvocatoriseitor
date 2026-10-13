'use client';

import { useRouter } from 'next/navigation';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useEffect, useTransition } from 'react';

/**
 * Refreshes the server data on tab focus and every 30 s while visible, shows how fresh it is,
 * and offers a manual refresh. `renderedAt` comes from the server render, so it updates on each refresh.
 */
export function LiveStatus({ renderedAt, intervalMs = 30_000 }: { renderedAt: string; intervalMs?: number }) {
  const t = useTranslations('squad');
  const format = useFormatter();
  const now = useNow({ updateInterval: 10_000 });
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, intervalMs]);

  const updated = new Date(renderedAt);
  const ago = now.getTime() - updated.getTime() < 10_000 ? t('justNow') : format.relativeTime(updated, now);

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span suppressHydrationWarning>{pending ? t('updating') : t('updated', { ago })}</span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="btn-link min-h-11 px-1"
      >
        {t('refresh')}
      </button>
    </div>
  );
}
