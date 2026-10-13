import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/current';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = { title: 'Bienvenida' };

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.mustChangePassword && user.team) redirect('/partido');

  const t = await getTranslations('welcome');
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title', { name: user.displayName })}</h1>
      <p className="mt-2 text-muted">{user.mustChangePassword ? t('intro') : t('introTeamOnly')}</p>
      <div className="card mt-4">
        <OnboardingForm needsPassword={user.mustChangePassword} team={user.team} />
      </div>
    </div>
  );
}
