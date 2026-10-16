import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export const block = 'animate-pulse rounded-[var(--radius-card)] bg-border/40';
export const line = 'animate-pulse rounded-lg bg-border/40';

/** Accessible wrapper for route loading placeholders: announces "Cargando…", hides the shapes. */
export async function PageSkeleton({ children, className }: { children: ReactNode; className?: string }) {
  const t = await getTranslations('common');
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/** Page title (and optional intro line) placeholder. */
export function TitleSkeleton({ intro = false }: { intro?: boolean }) {
  return (
    <>
      <div className={`${line} h-8 w-48`} />
      {intro && <div className={`${line} mt-2 h-5 w-72 max-w-full`} />}
    </>
  );
}
