import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth/current';

export const metadata: Metadata = { title: 'Administración' };

export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations('admin');
  const cards = [
    { href: '/admin/usuarios', title: t('users'), text: t('usersIntro') },
    { href: '/admin/partido', title: t('settings'), text: t('settingsIntro') },
    { href: '/admin/asistencia', title: t('attendance'), text: t('attendanceIntro') },
  ] as const;

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="card block h-full hover:border-brand">
              <h2 className="text-lg font-extrabold text-brand">{c.title}</h2>
              <p className="mt-1 text-muted">{c.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
