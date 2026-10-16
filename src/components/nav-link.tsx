'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LinkPendingBar } from './link-hint';

/** Header link that marks itself as the current page (also for sub-pages, e.g. /admin/usuarios). */
export function NavLink({
  href,
  section,
  className,
  children,
}: {
  href: string;
  section?: string;
  className: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const base = section ?? href;
  const active = pathname === base || pathname.startsWith(`${base}/`);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`relative ${className}`}>
      {children}
      <LinkPendingBar />
    </Link>
  );
}
