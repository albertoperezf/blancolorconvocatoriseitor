import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/current';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('nav'))('login') };
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/partido');
  const t = await getTranslations('login');
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <div className="card mt-4">
        <LoginForm />
      </div>
    </div>
  );
}
