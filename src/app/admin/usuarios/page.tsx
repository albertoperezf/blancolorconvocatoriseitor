import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ShirtIcon } from '@/components/icons';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { listResetRequests, listUsers } from '@/lib/services/admin';
import { EnrolForm } from './enrol-form';
import { ResetRequests } from './reset-requests';

export const metadata: Metadata = { title: 'Jugadores' };

export default async function UsersPage() {
  await requireAdmin();
  const db = await getDb();
  const [t, tTeams, users, requests] = await Promise.all([
    getTranslations('admin'),
    getTranslations('teams'),
    listUsers(db),
    listResetRequests(db),
  ]);

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{t('users')}</h1>
      <ResetRequests requests={requests} />
      <section aria-labelledby="enrol-heading" className="card mt-4">
        <h2 id="enrol-heading" className="mb-3 text-xl font-extrabold">
          {t('enrolHeading')}
        </h2>
        <EnrolForm />
      </section>
      <section aria-labelledby="list-heading" className="mt-6">
        <h2 id="list-heading" className="text-xl font-extrabold">
          {t('list', { count: users.length })}
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/usuarios/${u.id}`}
                className="card flex min-h-12 items-center gap-3 p-3 hover:border-brand sm:p-4"
              >
                <ShirtIcon
                  filled={u.team === 'color'}
                  className={`size-6 shrink-0 ${u.team === 'color' ? 'text-brand' : ''}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{u.displayName}</span>
                  <span className="block text-sm text-muted">
                    {u.team ? tTeams(u.team) : tTeams('none')}
                    {u.role === 'admin' && ` · ${t('roles.admin')}`}
                    {u.longTermAbsence && ` · ${t('absent')}`}
                    {!u.active && ` · ${t('inactive')}`}
                    {!u.hasPassword && ` · ${t('noPassword')}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
