import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip nonce/CSP for API routes -- they return JSON, not HTML
  // Addresses review concern: unnecessary CSP on API routes adds latency
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // Build CSP header with per-request nonce
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://app.cal.com${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "font-src 'self'",
    "img-src 'self' data: blob: https:",
    "frame-src 'self' https://app.cal.com https://www.google.com/maps/",
    "connect-src 'self' https://api.cal.com https://*.sentry.io https://*.ingest.sentry.io",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  const sessionToken = request.cookies.get('better-auth.session_token');

  // Protected routes: require session
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) {
    if (!sessionToken) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.headers.set('Content-Security-Policy', cspHeader);
      return response;
    }
  }

  // Auth pages: redirect authenticated users
  if (pathname === '/login' || pathname === '/register') {
    if (sessionToken) {
      const response = NextResponse.redirect(new URL('/portal', request.url));
      response.headers.set('Content-Security-Policy', cspHeader);
      return response;
    }
  }

  // Normal request -- inject nonce header and CSP
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (static metadata files)
     * - Public assets (images, videos, icons)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|images/|videos/|icons/).*)',
  ],
};
