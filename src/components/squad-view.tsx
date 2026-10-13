import { getTranslations } from 'next-intl/server';
import type { Position } from '@/lib/db/schema';
import { goingCount, type Squad, type SquadPlayer } from '@/lib/match/squad';
import { POSITIONS } from '@/lib/positions';
import { PositionIcon, ShirtIcon } from './icons';

type Name = { key: string; label: string; hint?: string; position?: Position | null; positionLabel?: string };

type GroupProps = {
  id: string;
  title: string;
  count: number;
  names: Name[];
  empty: string;
  open?: boolean;
  icon?: React.ReactNode;
  accent?: string;
};

function Group({ id, title, count, names, empty, open = true, icon, accent = 'border-border' }: GroupProps) {
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
    <div className="px-4 pb-4 sm:px-5">
      {names.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul aria-labelledby={id} className="flex flex-wrap gap-2">
          {names.map((n) => (
            <li
              key={n.key}
              className="inline-flex items-center gap-1.5 rounded-lg bg-bg px-2.5 py-1 text-sm font-medium"
            >
              {n.position && <PositionIcon position={n.position} className="size-4 shrink-0 text-muted" />}
              {n.label}
              {n.positionLabel && <span className="sr-only">, {n.positionLabel}</span>}
              {n.hint && <span className="text-muted"> · {n.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  const box = `card border-l-4 p-0 sm:p-0 ${accent}`;

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
      <h3 className="flex min-h-12 items-center gap-2 px-4 py-3 sm:px-5">{header}</h3>
      {body}
    </section>
  );
}

export async function SquadView({ squad }: { squad: Squad }) {
  const [t, tPos] = await Promise.all([getTranslations('squad'), getTranslations('positions')]);
  const empty = t('empty');
  const players = (list: SquadPlayer[]): Name[] =>
    list.map((p) => ({
      key: p.id,
      label: p.displayName,
      position: p.position,
      positionLabel: p.position ? tPos(p.position) : undefined,
    }));

  return (
    <section aria-labelledby="squad-heading" className="mt-8">
      <h2 id="squad-heading" className="text-xl font-extrabold">
        {t('heading')} <span className="font-semibold text-muted tabular-nums">({goingCount(squad)})</span>
      </h2>
      <ul aria-label={t('positionsLegend')} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {POSITIONS.map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5">
            <PositionIcon position={p} className="size-4" />
            {tPos(p)}
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Group
          id="g-blancos"
          title={t('blancos')}
          count={squad.blancos.length}
          names={players(squad.blancos)}
          empty={empty}
          icon={<ShirtIcon className="size-5" />}
          accent="border-l-fg/30"
        />
        <Group
          id="g-color"
          title={t('color')}
          count={squad.color.length}
          names={players(squad.color)}
          empty={empty}
          icon={<ShirtIcon filled className="size-5 text-brand" />}
          accent="border-l-brand"
        />
        <Group
          id="g-guests"
          title={t('guests')}
          count={squad.guests.length}
          names={squad.guests.map((g) => ({ key: g.id, label: g.name, hint: t('guestOf', { host: g.hostName }) }))}
          empty={empty}
          accent="border-l-going"
        />
      </div>
      {squad.noTeam.length > 0 && (
        <div className="mt-3">
          <Group
            id="g-noteam"
            title={t('noTeam')}
            count={squad.noTeam.length}
            names={players(squad.noTeam)}
            empty={empty}
          />
        </div>
      )}
      {/* items-start: opening one collapsible group must not stretch its neighbour in the same row. */}
      <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
        <Group
          id="g-maybe"
          title={t('maybe')}
          count={squad.maybe.length}
          names={players(squad.maybe)}
          empty={empty}
          accent="border-l-maybe"
        />
        <Group
          id="g-notgoing"
          title={t('notGoing')}
          count={squad.notGoing.length}
          names={players(squad.notGoing)}
          empty={empty}
          accent="border-l-notgoing"
        />
        <Group
          id="g-undecided"
          title={t('undecided')}
          count={squad.undecided.length}
          names={players(squad.undecided)}
          empty={empty}
          open={false}
        />
        <Group
          id="g-absent"
          title={t('absent')}
          count={squad.absent.length}
          names={players(squad.absent)}
          empty={empty}
          open={false}
        />
      </div>
    </section>
  );
}
