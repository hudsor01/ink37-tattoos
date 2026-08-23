import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

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
    // https://vercel.com -- @vercel/blob's client-side `upload()` POSTs to
    //   https://vercel.com/api/blob (see @vercel/blob dist:
    //   `defaultVercelBlobApiUrl = "https://vercel.com/api/blob"`). Five
    //   dashboard components call it (media-uploader, sortable-image-grid,
    //   media-page-client, profile-client, session-detail-client); without
    //   this every admin image upload fails with an opaque network error.
    // https://*.sentry.io rather than https://*.ingest.sentry.io -- a CSP
    //   host wildcard is a suffix match, so `*.ingest.sentry.io` matches
    //   `oNNN.ingest.sentry.io` but NOT the regional `oNNN.ingest.us.sentry.io`
    //   form Sentry issues for newer projects. Getting this wrong silently
    //   drops browser error reports, which is precisely how the blank-page
    //   outage stayed invisible for so long.
    // Dev adds bare `ws:`/`wss:` scheme-sources rather than
    // `ws://localhost:*`. next.config.ts's allowedDevOrigins deliberately
    // permits LAN (192.168.*.*), Tailscale CGNAT (100.*.*.*), MagicDNS
    // (*.tail367f2e.ts.net) and Cloudflare-tunnelled (*.thehudsonfam.com)
    // dev hosts, but a localhost-only connect-src blocks the HMR websocket
    // from every one of them -- dev server reachable, hot reload silently
    // dead. Scheme-sources are dev-only and never reach production.
    `connect-src 'self' https://*.sentry.io https://app.cal.com https://api.cal.com https://vercel.com${isDev ? ' ws: wss:' : ''}`,
    // https://www.google.com -- contact-client.tsx renders a Google Maps
    // embed iframe for the studio location; without it the map is a blank
    // bordered box.
    "frame-src 'self' https://app.cal.com https://www.google.com",
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
  // Use Better Auth's own reader rather than an exact cookie-name lookup.
  //
  // Better Auth derives the cookie name from baseURL at runtime
  // (cookies/index.mjs): `secureCookiePrefix = baseURL.startsWith('https://')
  // ? '__Secure-' : ''`. auth.ts sets `baseURL: process.env.BETTER_AUTH_URL`
  // and never sets `advanced.useSecureCookies`, so the real cookie is:
  //
  //   production  (https) -> __Secure-better-auth.session_token
  //   local dev   (http)  -> better-auth.session_token
  //
  // `request.cookies.get('better-auth.session_token')` is an exact Map
  // lookup with no prefix handling, so it matched in dev and NEVER matched
  // in production: every signed-in user read as logged out, /dashboard and
  // /portal 307'd to /login, and login/page.tsx sent them straight back --
  // an unbreakable redirect loop that only reproduced on https.
  //
  // getSessionCookie() checks `__Secure-`-prefixed and bare names, and both
  // the `.` and `-` separators, so it stays correct across environments and
  // any future prefix change.
  const sessionToken = getSessionCookie(request);
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
      // Clone nextUrl rather than resolving against request.url: with
      // `output: 'standalone'` behind a TLS-terminating proxy the two can
      // disagree on protocol/host, and nextUrl is the normalized one.
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('callbackUrl', pathWithSearch);
      // 303, not the NextResponse.redirect default of 307.
      //
      // 307 preserves the method and body. Server Actions POST to the URL of
      // the page they were invoked from, so a session expiring mid-form would
      // 307 that POST -- payload and all, including multipart uploads -- at
      // /login, a route that only handles GET, and leave a callbackUrl
      // pointing at a POST-only target. 303 See Other is the correct
      // semantic for an auth gate: it tells the UA to GET the login page
      // instead. Plain GET navigations behave identically under both.
      const redirectResponse = NextResponse.redirect(loginUrl, 303);
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
      // See the 303 rationale above; same reasoning applies here.
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      const redirectResponse = NextResponse.redirect(dashboardUrl, 303);
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
  // LOAD-BEARING -- do not remove. This is not merely informational.
  //
  // Next.js reads the nonce off the *request* CSP header and applies it to
  // every inline script it renders (the RSC payload flush scripts, and any
  // component that reads x-nonce). See app-render.js:
  //
  //   const csp = headers['content-security-policy']
  //             || headers['content-security-policy-report-only'];
  //   const nonce = typeof csp === 'string'
  //     ? getScriptNonceFromHeader(csp) : undefined;
  //
  // Drop this line and Next renders those scripts with no nonce attribute,
  // so the response-side policy below blocks them -- next-themes' theme
  // bootstrap stops executing, and React's own boundary-completion scripts
  // (the ones that swap streamed Suspense content into place) go with it.
  //
  // Not the JSON-LD blocks, despite the obvious guess: a <script> whose type
  // is not a JS MIME type is a data block, and HTML's "prepare the script
  // element" returns at type determination, before the CSP inline check. See
  // src/components/public/json-ld.tsx, which carries no nonce for that reason.
  //
  // Note the nonce must satisfy Next's CSP_NONCE_SOURCE_REGEX
  // (/^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/); a malformed value is silently
  // ignored and yields no nonce rather than an error.
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}
