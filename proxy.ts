import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/portal'];
const authPages = ['/login', '/register'];

/**
 * Build the per-request Content-Security-Policy header.
 * Uses a nonce on script-src so only scripts marked with the matching
 * `nonce` attribute (set by layout.tsx and BreadcrumbNav for JSON-LD,
 * and by next-themes for its theme-bootstrap script) execute. Style-src
 * keeps `'unsafe-inline'` because Next.js still emits inline styles for
 * the route announcer and the chart helpers (next.js issues #18557, #83764).
 */
function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://app.cal.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
    "font-src 'self'",
    `connect-src 'self' https://*.ingest.sentry.io https://app.cal.com https://api.cal.com${isDev ? ' ws://localhost:*' : ''}`,
    "frame-src 'self' https://app.cal.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Skip the proxy on static assets and Next.js internals. CSP only needs to
 * guard rendered HTML responses; running the proxy on every image / font /
 * favicon / _next/static chunk wastes CPU per request with no security benefit.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)',
  ],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('better-auth.session_token');

  // Per-request nonce + CSP header. crypto.randomUUID() is the Node CSPRNG.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = buildCSP(nonce);

  // Protected routes: redirect to login if no session cookie
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // CSP on a 302 is functionally inert (browsers don't render bodies of
      // redirects); the follow-up /login request is a fresh proxy invocation
      // with its own nonce + CSP. Keep the header here as defense-in-depth so
      // any user-agent that does inspect 3xx headers gets the policy too.
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }
  }

  // Auth pages: redirect to dashboard if already logged in
  if (authPages.some((page) => pathname.startsWith(page))) {
    if (sessionToken) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
      // See comment above: CSP on 3xx is defense-in-depth, the actual
      // policy that governs /dashboard rendering comes from its own
      // proxy pass.
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }
  }

  // Forward x-nonce so server components can read it via headers().
  // Set CSP on the response so the browser enforces it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}
