import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = ['__Host-session', 'session'];
const SESSION_TTL_S = 30 * 24 * 3600;

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Dev overlay injects inline styles; production only loads the CSS bundle.
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  // Sliding cookie expiry; the DB session is the source of truth.
  if (request.method === 'GET') {
    for (const name of SESSION_COOKIES) {
      const value = request.cookies.get(name)?.value;
      if (!value) continue;
      response.cookies.set(name, value, {
        httpOnly: true,
        secure: name.startsWith('__Host-'),
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL_S,
      });
    }
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
