import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { logoutAction } from '@/actions/auth';
import { getCurrentUser } from '@/lib/auth/current';
import { getTheme } from '@/lib/theme';
import { BallIcon } from './icons';
import { ThemeToggle } from './theme-toggle';

export async function SiteHeader() {
  const [t, user, theme] = await Promise.all([getTranslations('nav'), getCurrentUser(), getTheme()]);
  const link = 'inline-flex min-h-11 items-center rounded-lg px-2 font-semibold hover:bg-bg sm:px-3';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center gap-2 text-lg font-extrabold tracking-tight"
        >
          <BallIcon className="size-6 text-brand" />
          Blancolores
        </Link>
        <ThemeToggle initial={theme} />
        <nav aria-label={t('main')}>
          <ul className="flex flex-wrap items-center gap-1 text-sm sm:text-base">
            {user ? (
              <>
                <li>
                  <Link className={link} href="/partido">
                    {t('match')}
                  </Link>
                </li>
                <li>
                  <Link className={link} href="/perfil">
                    {t('profile')}
                  </Link>
                </li>
                {user.role === 'admin' && (
                  <li>
                    <Link className={link} href="/admin">
                      {t('admin')}
                    </Link>
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
