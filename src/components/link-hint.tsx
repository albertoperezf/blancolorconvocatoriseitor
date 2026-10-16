'use client';

import { useLinkStatus } from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRightIcon, SpinnerIcon } from './icons';

/**
 * Fixed-size slot inside a <Link>: a spinner while its page loads; otherwise `idle`
 * (default: a chevron shown only on hover). The parent Link needs the `group` class.
 */
export function LinkHint({ idle, className = '' }: { idle?: ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`inline-flex size-5 shrink-0 items-center justify-center text-brand ${className}`}>
      {pending ? (
        <SpinnerIcon className="size-5 animate-spin" />
      ) : (
        (idle ?? (
          <ChevronRightIcon className="size-5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        ))
      )}
    </span>
  );
}

/** Thin pulsing bar under a header link while its page loads. The parent Link needs `relative`. */
export function LinkPendingBar() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute inset-x-2 bottom-0.5 h-0.5 rounded-full bg-current transition-opacity ${pending ? 'animate-pulse opacity-100' : 'opacity-0'}`}
    />
  );
}
