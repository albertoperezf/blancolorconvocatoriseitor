import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { logoutAction } from '@/actions/auth';
import { getCurrentUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { countResetRequests } from '@/lib/services/admin';
import { getTheme } from '@/lib/theme';
import { BallIcon } from './icons';
import { NavLink } from './nav-link';
import { ThemeToggle } from './theme-toggle';

export async function SiteHeader() {
  const [t, user, theme] = await Promise.all([getTranslations('nav'), getCurrentUser(), getTheme()]);
  const pendingRequests = user?.role === 'admin' ? await countResetRequests(await getDb()) : 0;
  const link =
    'inline-flex min-h-11 items-center rounded-lg px-2 font-semibold hover:bg-bg sm:px-3 aria-[current=page]:bg-brand aria-[current=page]:text-brand-fg';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center gap-2 text-lg font-extrabold tracking-tight"
        >
          <BallIcon className="size-6 text-brand" />
          Blancolores
          <span className="rounded-full border border-brand px-2 py-0.5 text-xs font-bold tracking-wide text-brand uppercase">
            {t('beta')}
          </span>
        </Link>
        <ThemeToggle initial={theme} />
        <nav aria-label={t('main')}>
          <ul className="flex flex-wrap items-center gap-1 text-sm sm:text-base">
            <li>
              <NavLink className={link} href="/resultados">
                {t('results')}
              </NavLink>
            </li>
            {user ? (
              <>
                <li>
                  <NavLink className={link} href="/partido">
                    {t('match')}
                  </NavLink>
                </li>
                <li>
                  <NavLink className={link} href="/perfil">
                    {t('profile')}
                  </NavLink>
                </li>
                {user.role === 'admin' && (
                  <li>
                    <NavLink
                      className={`${link} gap-1.5`}
                      href={pendingRequests ? '/admin/usuarios' : '/admin'}
                      section="/admin"
                    >
                      {t('admin')}
                      {pendingRequests > 0 && (
                        <span className="rounded-full bg-maybe px-1.5 text-xs font-bold text-on-status tabular-nums">
                          {pendingRequests}
                          <span className="sr-only"> {t('pendingRequests', { count: pendingRequests })}</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                )}
                <li>
                  <form action={logoutAction}>
                    <button type="submit" className={link}>
                      {t('logout')}
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <li>
                <Link className="btn-primary min-h-11 px-4" href="/login">
                  {t('login')}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
