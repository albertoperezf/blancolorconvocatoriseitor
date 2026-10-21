import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { capitalizeMonths } from '@/lib/dates';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import {
  attendanceFrom,
  attendanceStats,
  countAttendanceMatches,
  type AttendanceStats,
} from '@/lib/match/attendance-stats';
import { getSettings } from '@/lib/match/queries';

export const metadata: Metadata = { title: 'Asistencia' };

const SORT_KEYS = ['name', 'went', 'maybe', 'missed'] as const;
type SortKey = (typeof SORT_KEYS)[number];
type Dir = 'asc' | 'desc';

const defaultDir = (key: SortKey): Dir => (key === 'name' ? 'asc' : 'desc');

function parseSort(orden: unknown, dir: unknown): { key: SortKey; dir: Dir } {
  const key = SORT_KEYS.find((k) => k === orden) ?? 'went';
  return { key, dir: dir === 'asc' || dir === 'desc' ? dir : defaultDir(key) };
}

function sortStats(rows: AttendanceStats[], { key, dir }: { key: SortKey; dir: Dir }) {
  const byName = (a: AttendanceStats, b: AttendanceStats) => a.displayName.localeCompare(b.displayName, 'es');
  const sign = dir === 'asc' ? 1 : -1;
  // Ties on a number column stay alphabetical whatever the direction.
  return [...rows].sort((a, b) => (key === 'name' ? sign * byName(a, b) : sign * (a[key] - b[key]) || byName(a, b)));
}

export default async function AttendancePage({ searchParams }: PageProps<'/admin/asistencia'>) {
  await requireAdmin();
  const db = await getDb();
  const [t, tAdmin, tTeams, format, settings, stats, played, params] = await Promise.all([
    getTranslations('attendance'),
    getTranslations('admin'),
    getTranslations('teams'),
    getFormatter(),
    getSettings(db),
    attendanceStats(db),
    countAttendanceMatches(db),
    searchParams,
  ]);
  const sort = parseSort(params.orden, params.dir);
  const since = capitalizeMonths(
    format.dateTime(attendanceFrom(), { day: 'numeric', month: 'long', timeZone: settings.timezone }),
  );
  const columns: { key: SortKey; label: string }[] = [
    { key: 'name', label: t('player') },
    { key: 'went', label: t('went') },
    { key: 'maybe', label: t('maybe') },
    { key: 'missed', label: t('missed') },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{tAdmin('attendance')}</h1>
      {played === 0 ? (
        <p className="card mt-4 text-muted">{t('emptyAdmin', { date: since })}</p>
      ) : (
        <>
          <p className="mt-1 max-w-prose text-muted">
            {t('adminIntro', {
              date: capitalizeMonths(
                format.dateTime(attendanceFrom(), {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: settings.timezone,
                }),
              ),
            })}
          </p>
          {/* Focusable so keyboard users can scroll it sideways on narrow screens. */}
          <div role="region" aria-label={t('tableLabel')} tabIndex={0} className="card mt-4 overflow-x-auto p-0 sm:p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  {columns.map((c, i) => {
                    const active = sort.key === c.key;
                    const nextDir = active ? (sort.dir === 'asc' ? 'desc' : 'asc') : defaultDir(c.key);
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                        className={`px-2 py-2 sm:px-4 font-semibold ${i > 0 ? 'text-right' : 'sticky left-0 bg-surface'}`}
                      >
                        <Link
                          href={`/admin/asistencia?orden=${c.key}&dir=${nextDir}`}
                          scroll={false}
                          className={`inline-flex min-h-11 items-center gap-1 hover:text-brand ${active ? 'text-brand' : ''}`}
                        >
                          {c.label}
                          <span aria-hidden className={active ? '' : 'text-muted opacity-50'}>
                            {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </Link>
                      </th>
                    );
                  })}
                  <th scope="col" className="hidden px-2 py-2 font-semibold sm:table-cell sm:px-4">
                    {t('team')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortStats(stats, sort).map((s) => (
                  <tr key={s.userId}>
                    <th scope="row" className="sticky left-0 bg-surface px-2 py-2 sm:px-4 font-semibold">
                      {s.displayName}
                      {s.longTermAbsence && (
                        <span className="ml-2 rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-muted">
                          {tAdmin('absent')}
                        </span>
                      )}
                    </th>
                    <td className="px-2 py-2 sm:px-4 text-right tabular-nums">{s.went}</td>
                    <td className="px-2 py-2 sm:px-4 text-right tabular-nums">{s.maybe}</td>
                    <td className="px-2 py-2 sm:px-4 text-right tabular-nums">{s.missed}</td>
                    <td className="hidden px-2 py-2 text-muted sm:table-cell sm:px-4">
                      {s.team ? tTeams(s.team) : tTeams('none')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
