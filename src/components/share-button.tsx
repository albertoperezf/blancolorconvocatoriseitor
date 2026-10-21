'use client';

import { ShareIcon } from './icons';

type Props = { text: string; label: string };

// Native share sheet where available (phones); otherwise the WhatsApp link does the job.
export function ShareButton({ text, label }: Props) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof navigator.share !== 'function') return;
    e.preventDefault();
    try {
      await navigator.share({ text });
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      // Phones: just the icon (44px tap area) beside the title; the label stays as its accessible name.
      className="btn-ghost max-md:size-11 max-md:justify-center max-md:before:hidden"
    >
      <ShareIcon className="size-5 text-going" />
      <span className="max-md:sr-only">{label}</span>
    </a>
  );
}
