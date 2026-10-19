import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BandageIcon, BanIcon, CrownIcon, LockOpenIcon, PencilIcon, ShirtIcon } from '@/components/icons';
import { LinkHint } from '@/components/link-hint';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { listResetRequests, listUsers } from '@/lib/services/admin';
import { EnrolSection } from '../enrol-section';
import { ResetRequests } from '../reset-requests';

export const metadata: Metadata = { title: 'Jugadores' };

const STATUS_ICONS = {
  admin: CrownIcon,
  editor: PencilIcon,
  absent: BandageIcon,
  inactive: BanIcon,
  noPassword: LockOpenIcon,
} as const;

type Status = keyof typeof STATUS_ICONS;

function statusesOf(u: { role: string; longTermAbsence: boolean; active: boolean; hasPassword: boolean }) {
  const s: Status[] = [];
  if (u.role === 'admin') s.push('admin');
  if (u.role === 'editor') s.push('editor');
  if (u.longTermAbsence) s.push('absent');
  if (!u.active) s.push('inactive');
  if (!u.hasPassword) s.push('noPassword');
  return s;
}

export default async function UsersPage() {
  await requireAdmin();
  const db = await getDb();
  const [t, tTeams, users, requests] = await Promise.all([
    getTranslations('admin'),
    getTranslations('teams'),
    listUsers(db),
    listResetRequests(db),
  ]);
  const statusLabel = (s: Status) => (s === 'admin' || s === 'editor' ? t(`roles.${s}`) : t(s));

  return (
    <>
      <EnrolSection title={t('users')} count={users.length}>
        <ResetRequests requests={requests} />
      </EnrolSection>
      <section aria-labelledby="list-heading" className="mt-4">
        {/* The visible count sits next to the page title; this keeps the list's heading for screen readers. */}
        <h2 id="list-heading" className="sr-only">
          {t('list', { count: users.length })}
        </h2>
        <ul aria-label={t('statusLegend')} className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {(Object.keys(STATUS_ICONS) as Status[]).map((s) => {
            const Icon = STATUS_ICONS[s];
            return (
              <li key={s} className="inline-flex items-center gap-1.5">
                <Icon className="size-4" />
                {statusLabel(s)}
              </li>
            );
          })}
        </ul>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const statuses = statusesOf(u);
            return (
              <li key={u.id}>
                {/* Always two single-line rows (name, team) so every card has the same height. */}
                <Link href={`/admin/usuarios/${u.id}`} className="card-link group flex items-center gap-3 p-3 sm:p-4">
                  <ShirtIcon
                    filled={u.team === 'color'}
                    className={`size-6 shrink-0 ${u.team === 'color' ? 'text-brand' : ''}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{u.displayName}</span>
                    <span className="block truncate text-sm text-muted">
                      {u.team ? tTeams(u.team) : tTeams('none')}
                    </span>
                    {statuses.length > 0 && <span className="sr-only">, {statuses.map(statusLabel).join(', ')}</span>}
                  </span>
                  {statuses.length > 0 && (
                    <span className="flex shrink-0 items-center gap-1.5 text-muted">
                      {statuses.map((s) => {
                        const Icon = STATUS_ICONS[s];
                        return (
                          <span key={s} className="group/st relative inline-flex">
                            <Icon className="size-5" />
                            <span
                              aria-hidden
                              className="invisible absolute right-0 bottom-full z-10 mb-1.5 rounded-md bg-fg px-2 py-1 text-xs font-semibold whitespace-nowrap text-bg opacity-0 shadow-md transition-opacity group-hover/st:visible group-hover/st:opacity-100"
                            >
                              {statusLabel(s)}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  )}
                  <LinkHint className="-mr-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
