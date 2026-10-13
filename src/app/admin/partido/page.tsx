import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { getSettings } from '@/lib/match/queries';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Partido semanal' };

export default async function MatchSettingsPage() {
  await requireAdmin();
  const [t, settings] = await Promise.all([getTranslations('admin'), getSettings(await getDb())]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('settings')}</h1>
      <p className="mt-1 text-muted">{t('settingsIntro')}</p>
      <div className="card mt-4">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
