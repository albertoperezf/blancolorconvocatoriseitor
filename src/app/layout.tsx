import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ExternalLink } from '@/components/external-link';
import { MailIcon, NewspaperIcon, PlayIcon } from '@/components/icons';
import { SiteHeader } from '@/components/site-header';
import { TouchActive } from '@/components/touch-active';
import { BLOG_URL, VIDEOS_URL } from '@/lib/links';
import { siteUrl } from '@/lib/site-url';
import { getTheme } from '@/lib/theme';
import './globals.css';

const footerLink = 'inline-flex min-h-6 items-center gap-1.5 font-semibold text-fg hover:text-brand';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('title'), template: `%s · Blancolores` },
    description: t('description'),
    applicationName: 'Blancolores',
    appleWebApp: { title: 'Blancolores', capable: true, statusBarStyle: 'default' },
    openGraph: {
      type: 'website',
      siteName: 'Blancolores',
      locale: 'es_ES',
      title: t('title'),
      description: t('description'),
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1216' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [t, theme] = await Promise.all([getTranslations(), getTheme()]);
  return (
    <html lang="es" data-theme={theme}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <a
            href="#contenido"
            className="sr-only z-50 rounded-lg bg-brand px-4 py-3 font-semibold text-brand-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t('nav.skip')}
          </a>
          <SiteHeader />
          <main
            id="contenido"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-12 sm:px-6 sm:pt-8"
          >
            {children}
          </main>
          <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">
            <p>{t('footer.text')}</p>
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              <li>
                <Link href="/contacto" className={footerLink}>
                  <MailIcon className="size-4" />
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <ExternalLink href={BLOG_URL} className={footerLink}>
                  <NewspaperIcon className="size-4" />
                  {t('footer.blog')}
                </ExternalLink>
              </li>
              <li>
                <ExternalLink href={VIDEOS_URL} className={footerLink}>
                  <PlayIcon className="size-4" />
                  {t('footer.videos')}
                </ExternalLink>
              </li>
            </ul>
          </footer>
        </NextIntlClientProvider>
        <TouchActive />
        {/* Their scripts only exist on Vercel; elsewhere (local, CI Lighthouse) they 404 on every page. */}
        {process.env.VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
