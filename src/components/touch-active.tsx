'use client';

import { useEffect } from 'react';

// iOS Safari only applies :active styles once the page listens for touches.
export function TouchActive() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    return () => document.removeEventListener('touchstart', noop);
  }, []);
  return null;
}
