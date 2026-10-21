import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import type { Position } from '@/lib/db/schema';
import { goingCount, type Squad, type SquadPlayer } from '@/lib/match/squad';
import { POSITIONS } from '@/lib/positions';
import { PositionIcon, ShirtIcon } from './icons';
import { LiveStatus } from './live-status';

type Name = {
  key: string;
  label: string;
  hint?: string;
  position?: Position | null;
  positionLabel?: string;
  isMe?: boolean;
};

type GroupProps = {
  id: string;
  title: string;
  count: number;
  names: Name[];
  empty: ReactNode;
  open?: boolean;
  /** Phones have little room: drop the box entirely while nobody is in it. */
  hideEmptyOnMobile?: boolean;
  className?: string;
  icon?: ReactNode;
  accent?: string;
  meLabel?: string;
};

function Group({
  id,
  title,
  count,
  names,
  empty,
  open = true,
  hideEmptyOnMobile = false,
  className = '',
  icon,
  accent = 'border-border',
  meLabel,
}: GroupProps) {
  const header = (
    <>
      {icon}
      <span id={id} className="font-extrabold tracking-wide">
        {title}
      </span>
      <span className="ml-auto rounded-full bg-bg px-2.5 py-0.5 text-sm font-bold tabular-nums">{count}</span>
    </>
  );
  const body = (
    <div className="px-4 pb-3 sm:px-5 md:pb-4">
      {names.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul aria-labelledby={id} className="flex flex-wrap gap-2">
          {names.map((n) => (
            <li
              key={n.key}
              // Inset ring: collapsible groups clip their content, which cut an outer ring off.
              className={`inline-flex items-center gap-1.5 rounded-lg bg-bg px-2.5 py-1 text-sm font-medium ${n.isMe ? 'font-extrabold ring-2 ring-brand ring-inset' : ''}`}
            >
              {n.position && (
                // Hover on desktop, tap (focus) on touch screens; tabIndex -1 keeps it out of the Tab order.
                <span tabIndex={-1} className="group/pos relative inline-flex cursor-help outline-none">
                  <PositionIcon position={n.position} className="size-4 shrink-0 text-muted" />
                  <span
                    aria-hidden
                    className="invisible absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-md bg-fg px-2 py-1 text-xs font-semibold whitespace-nowrap text-bg opacity-0 shadow-md transition-opacity group-hover/pos:visible group-hover/pos:opacity-100 group-focus/pos:visible group-focus/pos:opacity-100"
                  >
                    {n.positionLabel}
                  </span>
                </span>
              )}
              {n.label}
              {n.isMe && meLabel && <span className="font-semibold text-brand"> ({meLabel})</span>}
              {n.positionLabel && <span className="sr-only">, {n.positionLabel}</span>}
              {n.hint && <span className="text-muted"> · {n.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  const box = `card border-l-4 p-0 sm:p-0 ${accent} ${hideEmptyOnMobile && names.length === 0 ? 'max-md:hidden' : ''} ${className}`;

  // Long, low-interest lists start collapsed; headings stay out of <summary> to keep their semantics.
  if (!open) {
    return (
      <details className={`group ${box}`}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
          {header}
          <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        {body}
      </details>
    );
  }
  return (
    <section className={box} aria-labelledby={id}>
      <h3 className="flex min-h-10 items-center gap-2 px-4 py-2 sm:px-5 md:min-h-12 md:py-3">{header}</h3>
      {body}
    </section>
  );
}

type SquadViewProps = {
  squad: Squad;
  /** Current user's id, to highlight their own name. */
  meId?: string;
  /** Where "¡Sé el primero!" points: the login page, Mi partido, or the answer controls. */
  ctaHref: string;
};

export async function SquadView({ squad, meId, ctaHref }: SquadViewProps) {
  const [t, tPos] = await Promise.all([getTranslations('squad'), getTranslations('positions')]);
  const meLabel = t('me');
  const beFirst = (
    <>
      {t('empty')}{' '}
      <Link href={ctaHref} className="btn-link">
        {t('beFirst')}
      </Link>
    </>
  );
  const players = (list: SquadPlayer[]): Name[] =>
    list.map((p) => ({
      key: p.id,
      label: p.displayName,
      position: p.position,
      positionLabel: p.position ? tPos(p.position) : undefined,
      isMe: p.id === meId,
    }));
  const shared = { meLabel };

  return (
    <section aria-labelledby="squad-heading" className="mt-5 md:mt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="squad-heading" className="text-xl font-extrabold">
          {t('heading')} <span className="font-semibold text-muted tabular-nums">({goingCount(squad)})</span>
        </h2>
        <LiveStatus renderedAt={new Date().toISOString()} />
      </div>
      <div className="mt-2 grid gap-2 fold:grid-cols-2 md:mt-3 md:grid-cols-3 md:gap-3">
        <Group
          {...shared}
          id="g-blancos"
          title={t('blancos')}
          count={squad.blancos.length}
          names={players(squad.blancos)}
          empty={beFirst}
          icon={<ShirtIcon className="size-5" />}
          accent="border-l-blancos"
        />
        <Group
          {...shared}
          id="g-color"
          title={t('color')}
          count={squad.color.length}
          names={players(squad.color)}
          empty={beFirst}
          icon={<ShirtIcon filled className="size-5 text-brand" />}
          accent="border-l-brand"
        />
        <Group
          id="g-guests"
          title={t('guests')}
          count={squad.guests.length}
          names={squad.guests.map((g) => ({ key: g.id, label: g.name, hint: t('guestOf', { host: g.hostName }) }))}
          empty={t('emptyGuests')}
          accent="border-l-going"
          hideEmptyOnMobile
          className="fold:col-span-2 md:col-span-1"
        />
      </div>
      {squad.noTeam.length > 0 && (
        <div className="mt-2 md:mt-3">
          <Group
            {...shared}
            id="g-noteam"
            title={t('noTeam')}
            count={squad.noTeam.length}
            names={players(squad.noTeam)}
            empty={t('empty')}
          />
        </div>
      )}
      {/* items-start: opening one collapsible group must not stretch its neighbour in the same row. */}
      <div className="mt-2 grid items-start gap-2 fold:grid-cols-2 md:mt-3 md:gap-3">
        <Group
          {...shared}
          id="g-maybe"
          title={t('maybe')}
          count={squad.maybe.length}
          names={players(squad.maybe)}
          empty={t('emptyMaybe')}
          accent="border-l-maybe"
          hideEmptyOnMobile
        />
        <Group
          {...shared}
          id="g-notgoing"
          title={t('notGoing')}
          count={squad.notGoing.length}
          names={players(squad.notGoing)}
          empty={t('emptyNotGoing')}
          accent="border-l-notgoing"
          hideEmptyOnMobile
        />
        <Group
          {...shared}
          id="g-undecided"
          title={t('undecided')}
          count={squad.undecided.length}
          names={players(squad.undecided)}
          empty={t('emptyUndecided')}
          open={false}
        />
        <Group
          {...shared}
          id="g-absent"
          title={t('absent')}
          count={squad.absent.length}
          names={players(squad.absent)}
          empty={t('emptyAbsent')}
          open={false}
        />
      </div>
      <ul aria-label={t('positionsLegend')} className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {POSITIONS.map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5">
            <PositionIcon position={p} className="size-4" />
            {tPos(p)}
          </li>
        ))}
      </ul>
    </section>
  );
}
