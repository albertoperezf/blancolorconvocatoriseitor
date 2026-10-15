'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAutoHide } from '@/components/form';

/** Shows a one-time link with copy and WhatsApp share; the link is never stored client-side. */
export function ShareLink({ name, url }: { name: string; url: string }) {
  const t = useTranslations('admin');
  const [copied, setCopied] = useState<number | null>(null);
  const copiedVisible = useAutoHide(copied);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(t('whatsappText', { name, url }))}`;

  return (
    <div className="mt-3 rounded-xl border border-border bg-bg p-3">
      <label className="label" htmlFor="reset-url">
        {t('resetLink', { name })}
      </label>
      <input
        id="reset-url"
        className="input font-mono text-sm"
        value={url}
        readOnly
        onFocus={(e) => e.target.select()}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(Date.now());
          }}
        >
          {t('copy')}
        </button>
        <a className="btn-secondary" href={whatsapp} target="_blank" rel="noopener noreferrer">
          {t('whatsapp')}
        </a>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm">
        {copied !== null && copiedVisible && t('copied')}
      </p>
    </div>
  );
}
