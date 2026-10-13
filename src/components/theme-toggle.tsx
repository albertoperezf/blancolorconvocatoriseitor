'use client';

import { useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from './icons';

type Theme = 'light' | 'dark';

const query = '(prefers-color-scheme: dark)';
const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

export function ThemeToggle({ initial }: { initial?: Theme }) {
  const t = useTranslations('nav');
  const [choice, setChoice] = useState(initial);
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => initial === 'dark',
  );
  const isDark = choice ? choice === 'dark' : systemDark;

  function toggle() {
    const next: Theme = isDark ? 'light' : 'dark';
    setChoice(next);
    document.documentElement.dataset.theme = next;
    const secure = location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax${secure}`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={t('darkTheme')}
      title={t('darkTheme')}
      className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-bg"
    >
      {isDark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </button>
  );
}
