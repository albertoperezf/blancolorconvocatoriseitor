import { getTranslations } from 'next-intl/server';

const block = 'animate-pulse rounded-[var(--radius-card)] bg-border/40';

// Shown while a page's data loads (mostly noticeable on slow mobile connections).
export default async function Loading() {
  const t = await getTranslations('common');
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden>
        <div className={`${block} h-40`} />
        <div className="mt-8 h-6 w-40 animate-pulse rounded-lg bg-border/40" />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className={`${block} h-28`} />
          <div className={`${block} h-28`} />
          <div className={`${block} h-28`} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className={`${block} h-20`} />
          <div className={`${block} h-20`} />
        </div>
      </div>
    </div>
  );
}
