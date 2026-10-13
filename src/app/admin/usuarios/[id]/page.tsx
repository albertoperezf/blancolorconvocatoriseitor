import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/services/admin';
import { ResetLinkPanel } from './reset-link-panel';
import { UserForm } from './user-form';

export const metadata: Metadata = { title: 'Editar jugador' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUserPage({ params }: PageProps<'/admin/usuarios/[id]'>) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [t, user] = await Promise.all([getTranslations('admin'), getUser(await getDb(), id)]);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin/usuarios" className="btn-link">
        ← {t('back')}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{user.displayName}</h1>
      <p className="text-muted">{user.username}</p>
      <section aria-labelledby="edit-heading" className="card mt-4">
        <h2 id="edit-heading" className="mb-3 text-xl font-extrabold">
          {t('editHeading')}
        </h2>
        <UserForm user={user} isSelf={admin.id === user.id} />
      </section>
      <section aria-labelledby="reset-heading" className="card mt-4">
        <h2 id="reset-heading" className="text-xl font-extrabold">
          {t('resetHeading')}
        </h2>
        <p className="mt-1 mb-3 text-muted">{t('resetIntro')}</p>
        <ResetLinkPanel userId={user.id} />
      </section>
    </div>
  );
}
