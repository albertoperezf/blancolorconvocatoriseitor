import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { deleteUserAction } from '@/actions/admin';
import { LinkHint } from '@/components/link-hint';
import { TypedConfirmDialog } from '@/components/typed-confirm-dialog';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { countUpcomingGuests, getUser } from '@/lib/services/admin';
import { ResetLinkPanel } from './reset-link-panel';
import { UserForm } from './user-form';

export const metadata: Metadata = { title: 'Editar jugador' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUserPage({ params }: PageProps<'/admin/usuarios/[id]'>) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const db = await getDb();
  const [t, user, upcomingGuests] = await Promise.all([
    getTranslations('admin'),
    getUser(db, id),
    countUpcomingGuests(db, id),
  ]);
  if (!user) notFound();
  const isSelf = admin.id === user.id;

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin/usuarios" className="btn-link inline-flex items-center gap-1">
        <LinkHint idle="←" />
        {t('back')}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{user.displayName}</h1>
      <section aria-labelledby="edit-heading" className="card mt-4">
        <h2 id="edit-heading" className="mb-3 text-xl font-extrabold">
          {t('editHeading')}
        </h2>
        <UserForm user={user} isSelf={isSelf} upcomingGuests={upcomingGuests} />
      </section>
      <section aria-labelledby="reset-heading" className="card mt-4">
        <h2 id="reset-heading" className="text-xl font-extrabold">
          {t('resetHeading')}
        </h2>
        <p className="mt-1 mb-3 text-muted">{t('resetIntro')}</p>
        <ResetLinkPanel userId={user.id} />
      </section>
      <section aria-labelledby="delete-heading" className="card mt-4">
        <h2 id="delete-heading" className="text-xl font-extrabold">
          {t('deleteUser.heading')}
        </h2>
        <p className="mt-1 text-muted">
          {isSelf ? t('deleteUser.self') : t('deleteUser.intro', { name: user.displayName })}
        </p>
        <TypedConfirmDialog
          action={deleteUserAction.bind(null, user.id)}
          word={user.username}
          trigger={t('deleteUser.open')}
          disabled={isSelf}
          title={t('deleteUser.confirmTitle', { name: user.displayName })}
          body={t('deleteUser.confirmBody', { name: user.displayName })}
          confirm={t('deleteUser.confirm')}
        />
      </section>
    </div>
  );
}
