import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

// Only the squad (/) and /resultados are meant for search engines.
const PRIVATE_ROUTES = [
  '/login',
  '/recuperar',
  '/bienvenida',
  '/partido',
  '/perfil',
  '/admin/:path*',
  '/restablecer/:path*',
  '/api/:path*',
];

const nextConfig: NextConfig = {
  // Cache Components is off: the strict nonce-based CSP needs request-time rendering,
  // and every page shows live attendance data anyway.
  poweredByHeader: false,
  serverExternalPackages: ['@electric-sql/pglite', '@node-rs/argon2'],
  turbopack: {
    // A stray package-lock.json in a parent folder would otherwise be picked as the root.
    root: process.cwd(),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...PRIVATE_ROUTES.map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
