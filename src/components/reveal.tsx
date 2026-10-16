import type { ReactNode } from 'react';

/**
 * Slides its content open/closed (grid rows 0fr ↔ 1fr, so it animates to the natural height).
 * Visibility flips at once on opening (so a field inside can take focus) and only after the slide on closing.
 */
export function Reveal({ open, children, className = '' }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={`grid duration-300 ease-out ${
        open
          ? 'visible grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity]'
          : 'invisible grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,visibility]'
      } ${className}`}
      inert={!open}
    >
      {/* -m-2 p-2: room for focus rings, which overflow-hidden would otherwise cut; net layout is unchanged. */}
      <div className="-m-2 min-h-0 overflow-hidden p-2">{children}</div>
    </div>
  );
}
