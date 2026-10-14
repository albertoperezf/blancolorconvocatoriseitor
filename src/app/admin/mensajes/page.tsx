import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { deleteContactMessageAction } from '@/actions/contact';
import { requireAdmin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { listContactMessages } from '@/lib/services/contact';

export const metadata: Metadata = { title: 'Mensajes' };

export default async function MessagesPage() {
  await requireAdmin();
  const db = await getDb();
  const [t, format, messages] = await Promise.all([getTranslations('admin'), getFormatter(), listContactMessages(db)]);
  const now = new Date();

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">{t('messages')}</h1>
      <p className="mt-1 text-muted">{t('messagesIntro')}</p>
      {messages.length === 0 ? (
        <p className="card mt-4 text-muted">{t('messagesEmpty')}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {messages.map((m) => (
            <li key={m.id} className="card">
              <p className="font-bold">
                {m.name}{' '}
                <a href={`mailto:${m.email}`} className="btn-link font-medium">
                  {m.email}
                </a>
              </p>
              <p className="text-sm text-muted">
                <time
                  dateTime={m.createdAt.toISOString()}
                  title={format.dateTime(m.createdAt, { dateStyle: 'long', timeStyle: 'short' })}
                >
                  {format.relativeTime(m.createdAt, now)}
                </time>
              </p>
              <p className="mt-2 whitespace-pre-line">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(t('replySubject'))}`}
                  className="btn-secondary"
                >
                  {t('reply')}
                </a>
                <form action={deleteContactMessageAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="btn-link min-h-12" aria-label={t('deleteFor', { name: m.name })}>
                    {t('delete')}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
