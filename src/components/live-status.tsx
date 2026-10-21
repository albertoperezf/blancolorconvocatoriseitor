'use client';

import { useRouter } from 'next/navigation';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useEffect, useTransition } from 'react';

const STALE_MS = 60_000;

/**
 * Refreshes the server data every 30 s while the tab is visible, when it comes back to the foreground and when
 * the connection returns. The age only shows once updates stop arriving (offline, server unreachable).
 */
export function LiveStatus({ renderedAt, intervalMs = 30_000 }: { renderedAt: string; intervalMs?: number }) {
  const t = useTranslations('squad');
  const format = useFormatter();
  const now = useNow({ updateInterval: 10_000 });
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      // A failed refresh makes Next reload the whole page (the browser's error page when offline): check first.
      const reachable = await fetch('/manifest.webmanifest', { method: 'HEAD', cache: 'no-store' }).then(
        (r) => r.ok,
        () => false,
      );
      if (reachable) startTransition(() => router.refresh());
    };
    const id = window.setInterval(refresh, intervalMs);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [router, intervalMs]);

  const updated = new Date(renderedAt);
  if (now.getTime() - updated.getTime() < STALE_MS) return null;
  return (
    <p className="text-sm text-muted" suppressHydrationWarning>
      {t('updated', {
        ago: format.relativeTime(updated, { now, style: 'narrow' }).replace(/(\d)[\s\u00a0\u202f]+/, '$1'),
      })}
    </p>
  );
}
