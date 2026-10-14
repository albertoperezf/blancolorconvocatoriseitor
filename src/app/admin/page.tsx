import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { countContactMessages } from '@/lib/services/contact';

export const metadata: Metadata = { title: 'Administración' };

export default async function AdminPage() {
  await requireAdmin();
  const [t, messageCount] = await Promise.all([getTranslations('admin'), countContactMessages(await getDb())]);
  const cards = [
    { href: '/admin/usuarios', title: t('users'), text: t('usersIntro') },
    { href: '/admin/partido', title: t('settings'), text: t('settingsIntro') },
    { href: '/admin/asistencia', title: t('attendance'), text: t('attendanceIntro') },
    { href: '/admin/mensajes', title: t('messages'), text: t('messagesIntro'), badge: messageCount || undefined },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="card block h-full hover:border-brand">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-brand">
                {c.title}
                {c.badge && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-fg tabular-nums">
                    {c.badge}
                    <span className="sr-only"> {t('messagesCount', { count: c.badge })}</span>
                  </span>
                )}
              </h2>
              <p className="mt-1 text-muted">{c.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
