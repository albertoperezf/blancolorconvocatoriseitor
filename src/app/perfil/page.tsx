import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth/current';
import { ChangePasswordForm, CloseSessionsForm, PositionForm, TeamForm } from './profile-forms';

export const metadata: Metadata = { title: 'Perfil' };

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations('profile');

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-muted">
        {user.displayName}
        {user.displayName.toLowerCase() !== user.username.toLowerCase() && ` · ${user.username}`}
      </p>
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
