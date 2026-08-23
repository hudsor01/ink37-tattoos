import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/portal'];
const authPages = ['/login', '/register'];

/**
 * Build the per-request Content-Security-Policy header.
 * Uses a nonce on script-src so inline scripts marked with the matching
 * `nonce` attribute (set by layout.tsx and BreadcrumbNav for JSON-LD,
 * and by next-themes for its theme-bootstrap script) execute. Style-src
 * keeps `'unsafe-inline'` because Next.js still emits inline styles for
 * the route announcer and the chart helpers (next.js issues #18557, #83764).
 *
 * DO NOT add `'strict-dynamic'` here. It looks like a security upgrade and
 * is what Next's own with-strict-csp example uses, but it is fundamentally
 * incompatible with this app's rendering model and takes the whole site down:
 *
 *   1. Per CSP Level 3, when `'strict-dynamic'` is present the browser
 *      IGNORES every host-source expression in script-src -- that means
 *      `'self'` AND `https://app.cal.com` become inert. Only nonce'd (or
 *      hashed) scripts, plus scripts those trusted scripts inject at
 *      runtime, are allowed to execute.
 *   2. `cacheComponents: true` in next.config.ts turns on Cache Components /
 *      PPR, so every route ships a statically prerendered shell. That shell's
 *      bootstrap `<script src="/_next/static/chunks/*.js">` tags are emitted
 *      at BUILD time, when no per-request nonce exists, so they carry no
 *      nonce attribute. Next's docs say this outright: "Partial Prerendering
 *      (PPR) is also incompatible with nonce-based CSP because static shell
 *      scripts cannot access the nonce."
 *      https://nextjs.org/docs/app/guides/content-security-policy
 *   3. Net effect: the browser downloads every JS chunk but refuses to run
 *      any of them (the turbopack runtime included). React never hydrates.
 *      PageTransition then stays pinned at its server-rendered
 *      `initial={{ opacity: 0 }}` and the entire site renders BLANK --
 *      DOM present, zero visible text. It also silently killed the Cal.com
 *      booking embed, since rule 1 made `https://app.cal.com` inert too.
 *
 * Keeping plain `'self'` is the correct policy for a prerendered app: it is
 * the standard Next.js CSP, it still blocks arbitrary inline/injected script,
 * and it does not force every page to become dynamic. Making `'strict-dynamic'`
 * work would mean giving up PPR/ISR entirely (`await connection()` on every
 * page) -- a large, permanent perf regression to buy a marginal hardening on a
 * site that loads no third-party script beyond Cal.com.
 * Regression coverage lives in src/__tests__/csp.test.ts.
 */
function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://app.cal.com${isDev ? " 'unsafe-eval'" : ''}`,
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
  const { pathname, search } = request.nextUrl;
  const sessionToken = request.cookies.get('better-auth.session_token');
  // Combine path + query so AuthGuards can preserve filter/sort state
  // when redirecting through the auth flow (e.g. /dashboard/orders?status=open
  // → user signs in → lands back with the filter intact). Using a single
  // header value keeps the safeCallbackUrl validator's surface tiny.
  const pathWithSearch = `${pathname}${search}`;

  // Per-request nonce + CSP header. crypto.randomUUID() is the Node CSPRNG.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = buildCSP(nonce);

  // Protected routes: redirect to login if no session cookie. Use the
  // path+search variant so a deep-linked /dashboard/orders?status=open
  // round-trips through the auth flow with the query intact.
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathWithSearch);
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
  // Forward x-pathname (path + query string) so AuthGuards in (dashboard)
  // and (portal) can build a callbackUrl that lands the user back on the
  // exact page they were trying to visit, rather than the segment root.
  // Header is namespaced `x-pathname` (not `x-next-pathname`) because
  // there is no Next.js convention by that name -- callers should not
  // assume the framework sets it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', pathWithSearch);
  // CSP on the *request* headers is functionally inert as far as the
  // browser is concerned -- only the response-side header below
  // governs script execution. We set it on the request too so server
  // components can read the policy via headers() if they ever need to
  // (e.g., to mirror it on a Response constructed in a route handler).
  // Don't remove without auditing for header() readers.
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}
