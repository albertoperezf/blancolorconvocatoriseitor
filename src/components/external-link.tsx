import { useTranslations } from 'next-intl';
import type { AnchorHTMLAttributes } from 'react';
import { ExternalIcon } from './icons';

/** Link to another site: opens in a new tab, marked with ↗ and announced to screen readers. */
export function ExternalLink({ children, ...anchor }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const t = useTranslations('common');
  return (
    <a {...anchor} target="_blank" rel="noopener noreferrer">
      {children}
      <ExternalIcon className="size-3.5 shrink-0" />
      <span className="sr-only"> {t('newTab')}</span>
    </a>
  );
}
