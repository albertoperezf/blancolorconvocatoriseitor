import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { logoutAction } from '@/actions/auth';
import { requireUser } from '@/lib/auth/current';
import { BallIcon } from '@/components/icons';
import { PushSettings } from '@/components/push/push-settings';
import { getDb } from '@/lib/db';
import { attendanceFrom, attendanceStats } from '@/lib/match/attendance-stats';
import { playerGoals } from '@/lib/match/goals';
import { getSettings } from '@/lib/match/queries';
import { vapidPublicKey } from '@/lib/push/service';
import { PlayingSection, SecuritySection } from './profile-forms';

export const metadata: Metadata = { title: 'Perfil' };

const STATS = [
  ['went', 'text-going'],
  ['maybe', 'text-maybe'],
  ['missed', 'text-notgoing'],
] as const;

export default async function ProfilePage() {
  const user = await requireUser();
  const db = await getDb();
  const [t, tA, tPush, format, settings, [stats], goals] = await Promise.all([
    getTranslations('profile'),
    getTranslations('attendance'),
    getTranslations('push'),
    getFormatter(),
    getSettings(db),
    attendanceStats(db, { userId: user.id }),
    playerGoals(db, user.id),
  ]);
  const total = stats ? stats.went + stats.maybe + stats.missed : 0;
  const pushKey = vapidPublicKey();
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
        {goals > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-bg px-3 py-2 font-bold">
            <BallIcon className="size-5 shrink-0 text-brand" />
            {tA('myGoals', { count: goals })}
          </p>
        )}
      </section>
      {pushKey && (
        <section id="notificaciones" aria-labelledby="push-heading" className="card mt-4 scroll-mt-20">
          <h2 id="push-heading" className="mb-1 text-xl font-extrabold">
            {tPush('heading')}
          </h2>
          <PushSettings publicKey={pushKey} isAdmin={user.role === 'admin'} />
        </section>
      )}
      <PlayingSection team={user.team} position={user.position} />
      <SecuritySection username={user.username} />
      <form action={logoutAction} className="mt-6">
        <button type="submit" className="btn-secondary w-full sm:w-auto">
          {t('logout')}
        </button>
      </form>
    </div>
  );
}
