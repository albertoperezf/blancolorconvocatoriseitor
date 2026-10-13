import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { findValidResetToken } from '@/lib/auth/service';
import { Notice } from '@/components/form';
import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'Nueva contraseña', referrer: 'no-referrer' };

export default async function ResetPage({ params }: PageProps<'/restablecer/[token]'>) {
  const { token } = await params;
  const [t, row] = await Promise.all([getTranslations('reset'), findValidResetToken(await getDb(), token)]);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      {row ? (
        <>
          <p className="mt-2 text-muted">{t('intro', { name: row.displayName })}</p>
          <div className="card mt-4">
            <ResetForm token={token} username={row.username} />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <Notice tone="error">{t('invalid')}</Notice>
        </div>
      )}
    </div>
  );
}
