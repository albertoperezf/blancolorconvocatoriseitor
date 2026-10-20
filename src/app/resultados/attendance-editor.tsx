'use client';

import { useTranslations } from 'next-intl';
import { ShirtIcon } from '@/components/icons';
import type { Team } from '@/lib/db/schema';

export type Attendee = { id: string; name: string; team: Team | null };
export type MatchGuest = { id: string; name: string; hostName: string };

type Props = {
  going: Attendee[];
  guests: MatchGuest[];
  others: Attendee[];
  absent: Set<string>;
  present: Attendee[];
  removedGuests: Set<string>;
  onToggleAbsent: (id: string) => void;
  onAddPresent: (player: Attendee) => void;
  onRemovePresent: (id: string) => void;
  onToggleGuest: (id: string) => void;
};

const rowButton = 'btn-secondary min-h-10 shrink-0 px-3 text-sm';

/** "Quién vino": fixes who actually came; applied together with the score when saving. */
export function AttendanceEditor(p: Props) {
  const t = useTranslations('results');
  const presentIds = new Set(p.present.map((a) => a.id));
  const addable = p.others.filter((o) => !presentIds.has(o.id));
  const players = p.going.length - p.absent.size + p.present.length;
  const guests = p.guests.length - p.removedGuests.size;
  const shirt = (team: Team | null) => (
    <ShirtIcon
      filled={team === 'color'}
      className={`size-5 shrink-0 ${team === 'color' ? 'text-brand' : ''} ${team ? '' : 'opacity-0'}`}
    />
  );

  return (
    <details className="group mt-4 rounded-xl border border-border">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 font-bold [&::-webkit-details-marker]:hidden">
        {t('attendanceHeading')}
        <span className="ml-auto text-sm font-semibold text-muted">{t('attendanceSummary', { players, guests })}</span>
        <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-3 pb-3">
        <p className="text-sm text-muted">{t('attendanceHint')}</p>
        <ul className="mt-2 flex flex-col">
          {p.going.map((a) => {
            const gone = p.absent.has(a.id);
            return (
              <li key={a.id} className="flex min-h-11 items-center gap-2">
                {shirt(a.team)}
                <span className={`min-w-0 flex-1 truncate font-medium ${gone ? 'text-muted line-through' : ''}`}>
                  {a.name}
                </span>
                <button
                  type="button"
                  className={rowButton}
                  aria-label={gone ? t('cameFor', { name: a.name }) : t('noShowFor', { name: a.name })}
                  onClick={() => p.onToggleAbsent(a.id)}
                >
                  {gone ? t('undo') : t('noShow')}
                </button>
              </li>
            );
          })}
          {p.present.map((a) => (
            <li key={a.id} className="flex min-h-11 items-center gap-2">
              {shirt(a.team)}
              <span className="min-w-0 flex-1 truncate font-medium">
                {a.name} <span className="text-sm text-muted">({t('addedTag')})</span>
              </span>
              <button
                type="button"
                className={rowButton}
                aria-label={t('removeFor', { name: a.name })}
                onClick={() => p.onRemovePresent(a.id)}
              >
                {t('remove')}
              </button>
            </li>
          ))}
          {p.guests.map((g) => {
            const gone = p.removedGuests.has(g.id);
            return (
              <li key={g.id} className="flex min-h-11 items-center gap-2">
                <span aria-hidden className="w-5 shrink-0 text-center font-bold text-going">
                  ＋
                </span>
                <span className={`min-w-0 flex-1 truncate font-medium ${gone ? 'text-muted line-through' : ''}`}>
                  {g.name} <span className="text-sm text-muted">({t('guestOf', { host: g.hostName })})</span>
                </span>
                <button
                  type="button"
                  className={rowButton}
                  aria-label={gone ? t('keepGuestFor', { name: g.name }) : t('removeFor', { name: g.name })}
                  onClick={() => p.onToggleGuest(g.id)}
                >
                  {gone ? t('undo') : t('remove')}
                </button>
              </li>
            );
          })}
        </ul>
        {addable.length > 0 && (
          <select
            className="input mt-2"
            aria-label={t('addAttendee')}
            value=""
            onChange={(e) => {
              const player = addable.find((o) => o.id === e.target.value);
              if (player) p.onAddPresent(player);
            }}
          >
            <option value="">{t('addAttendeeOption')}</option>
            {addable.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </details>
  );
}
