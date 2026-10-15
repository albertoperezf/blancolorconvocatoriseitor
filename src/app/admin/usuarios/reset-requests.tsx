import { getFormatter, getTranslations } from 'next-intl/server';
import { dismissResetRequestAction } from '@/actions/admin';
import { ResetLinkPanel } from './[id]/reset-link-panel';

type Request = { userId: string; displayName: string; username: string; requestedAt: Date };

export async function ResetRequests({ requests }: { requests: Request[] }) {
  if (requests.length === 0) return null;
  const [t, format] = await Promise.all([getTranslations('admin'), getFormatter()]);
  const now = new Date();

  return (
    <section aria-labelledby="requests-heading" className="card mt-4 border-l-4 border-l-maybe">
      <h2 id="requests-heading" className="text-xl font-extrabold">
        {t('requestsHeading', { count: requests.length })}
      </h2>
      <p className="mt-1 text-muted">{t('requestsIntro')}</p>
      <ul className="mt-3 divide-y divide-border">
        {requests.map((r) => (
          <li key={r.userId} className="py-3">
            <p className="font-bold">{r.displayName}</p>
            <p className="text-sm text-muted">
              <time dateTime={r.requestedAt.toISOString()}>{format.relativeTime(r.requestedAt, now)}</time>
            </p>
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <ResetLinkPanel userId={r.userId} />
              </div>
              <form action={dismissResetRequestAction}>
                <input type="hidden" name="userId" value={r.userId} />
                <button
                  type="submit"
                  className="btn-link min-h-12"
                  aria-label={t('dismissFor', { name: r.displayName })}
                >
                  {t('dismiss')}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
