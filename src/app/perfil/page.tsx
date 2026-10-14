import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { attendanceFrom, attendanceStats } from '@/lib/match/attendance-stats';
import { getSettings } from '@/lib/match/queries';
import { ChangePasswordForm, CloseSessionsForm, PositionForm, TeamForm } from './profile-forms';

export const metadata: Metadata = { title: 'Perfil' };

const STATS = [
  ['went', 'text-going'],
  ['maybe', 'text-maybe'],
  ['missed', 'text-notgoing'],
] as const;

export default async function ProfilePage() {
  const user = await requireUser();
  const db = await getDb();
  const [t, tA, format, settings, [stats]] = await Promise.all([
    getTranslations('profile'),
    getTranslations('attendance'),
    getFormatter(),
    getSettings(db),
    attendanceStats(db, { userId: user.id }),
  ]);
  const total = stats ? stats.went + stats.maybe + stats.missed : 0;
  const since = format.dateTime(attendanceFrom(), { day: 'numeric', month: 'long', timeZone: settings.timezone });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-muted">
        {user.displayName}
        {user.displayName.toLowerCase() !== user.username.toLowerCase() && ` · ${user.username}`}
      </p>
      <section aria-labelledby="attendance-heading" className="card mt-4">
        <h2 id="attendance-heading" className="text-xl font-extrabold">
          {tA('profileHeading')}
        </h2>
        {total === 0 ? (
          <p className="mt-1 text-muted">{tA('empty', { date: since })}</p>
        ) : (
          <>
            <p className="mt-1 text-muted">{tA('since', { count: total, date: since })}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {STATS.map(([key, color]) => (
                <div key={key} className="rounded-xl bg-bg px-2 py-3">
                  <dt className="text-sm text-muted">{tA(key)}</dt>
                  <dd className={`text-3xl font-extrabold tabular-nums ${color}`}>{stats[key]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-muted">{tA('basis')}</p>
          </>
        )}
      </section>
      <section aria-labelledby="team-heading" className="card mt-4">
        <h2 id="team-heading" className="mb-3 text-xl font-extrabold">
          {t('teamHeading')}
        </h2>
        <TeamForm team={user.team} />
      </section>
      <section aria-labelledby="position-heading" className="card mt-4">
        <h2 id="position-heading" className="mb-3 text-xl font-extrabold">
          {t('positionHeading')}
        </h2>
        <PositionForm position={user.position} />
      </section>
      <section aria-labelledby="password-heading" className="card mt-4">
        <h2 id="password-heading" className="mb-3 text-xl font-extrabold">
          {t('passwordHeading')}
        </h2>
        <ChangePasswordForm username={user.username} />
      </section>
      <section aria-labelledby="sessions-heading" className="card mt-4">
        <h2 id="sessions-heading" className="text-xl font-extrabold">
          {t('sessionsHeading')}
        </h2>
        <p className="mt-1 mb-3 text-muted">{t('sessionsHint')}</p>
        <CloseSessionsForm />
      </section>
    </div>
  );
}
