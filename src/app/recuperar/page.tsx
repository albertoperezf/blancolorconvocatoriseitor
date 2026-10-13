import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/current';
import { RecoverForm } from './recover-form';

export const metadata: Metadata = { title: 'He olvidado mi contraseña' };

export default async function RecoverPage() {
  if (await getCurrentUser()) redirect('/perfil');
  const t = await getTranslations('recover');
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-muted">{t('intro')}</p>
      <div className="card mt-4">
        <RecoverForm />
      </div>
    </div>
  );
}
