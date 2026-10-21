'use client';

import { useEffect } from 'react';

const DURATION = 300;
// Tailwind's ease-out, like <Reveal>.
const EASING = 'cubic-bezier(0, 0, 0.2, 1)';

type Running = { animation: Animation; closing: boolean };

/**
 * Animates every <details> open and closed by its height. Browser-only CSS (::details-content) doesn't work on
 * Safari or older Android browsers; clicks on a summary are taken over here instead.
 */
export function SmoothDetails() {
  useEffect(() => {
    const running = new WeakMap<HTMLDetailsElement, Running>();
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || reduceMotion.matches) return;
      const summary = (e.target as Element | null)?.closest?.('summary');
      const details = summary?.parentElement;
      if (!(details instanceof HTMLDetailsElement) || details.querySelector(':scope > summary') !== summary) return;
      e.preventDefault();

      const current = running.get(details);
      const closing = current ? !current.closing : details.open;
      const from = details.getBoundingClientRect().height;
      current?.animation.cancel();

      let to: number;
      if (closing) {
        const style = getComputedStyle(details);
        const frame = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'] as const;
        to = summary!.getBoundingClientRect().height + frame.reduce((sum, p) => sum + parseFloat(style[p]), 0);
        details.dataset.closing = '';
      } else {
        delete details.dataset.closing;
        details.open = true;
        to = details.getBoundingClientRect().height;
      }

      details.style.overflow = 'clip';
      const animation = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: DURATION, easing: EASING });
      running.set(details, { animation, closing });
      animation.onfinish = () => {
        if (closing) details.open = false;
        delete details.dataset.closing;
        details.style.overflow = '';
        running.delete(details);
      };
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
