import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/portal'];

/**
 * Segment-boundary match, not a bare `startsWith`.
 *
 * `pathname.startsWith('/dashboard')` also matches `/dashboardxyz`, so any
 * future public route that merely shares a prefix would be silently pulled
 * behind the auth gate. That directly contradicts safe-callback.ts, which
 * documents `/login-help` and `/registered-users` as legitimate destinations
 * and exact-matches to avoid exactly this -- previously safeCallbackUrl would
 * certify such a path as a valid post-sign-in target and the proxy would then
 * bounce the user off it, with no error surfaced anywhere.
 */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Build the per-request Content-Security-Policy header.
 * Uses a nonce on script-src so inline scripts marked with the matching
 * `nonce` attribute execute -- in practice next-themes' theme-bootstrap
 * script and the RSC payload / Suspense-completion scripts Next renders at
 * request time. NOT the JSON-LD blocks: those are data blocks, which HTML
 * exempts from the CSP inline check, so json-ld.tsx carries no nonce (see
 * the note further down this file). Style-src
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
    // Dev also needs https://va.vercel-scripts.com: <Analytics /> and
    // <SpeedInsights /> are mounted unconditionally in providers.tsx. In
    // production both resolve to same-origin /_vercel/... paths that 'self'
    // covers, but in development they load script.debug.js from that host, so
    // without it `bun run dev` logs two "Refused to load the script" errors
    // per page load and track() calls never reach the debug endpoint.
    `script-src 'self' 'nonce-${nonce}' https://app.cal.com${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
    // https://cal.com (NOT app.cal.com -- a different host): @calcom/embed-core
    // runs in the PARENT document, not the iframe, and injects
    // `@font-face{font-family:Cal Sans;src:url(https://cal.com/cal.ttf)}` into
    // this page's stylesheet. cal-embed.tsx uses it via getCalApi(), so
    // without this the booking widget renders in a fallback face and logs a
    // CSP violation on every /booking load.
    "font-src 'self' https://cal.com",
    // media-src has no fallback of its own beyond default-src 'self', so
    // blob-hosted video was unplayable even though media-uploader.tsx and
    // media-page-client.tsx both accept video/mp4 uploads to that exact host.
    // The image half of this gap (img-src + images.remotePatterns) was closed
    // earlier; this is the video half.
    "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
    // https://vercel.com -- @vercel/blob's client-side `upload()` POSTs to
    //   https://vercel.com/api/blob (see @vercel/blob dist:
    //   `defaultVercelBlobApiUrl = "https://vercel.com/api/blob"`). Five
    //   dashboard components call it (media-uploader, sortable-image-grid,
    //   media-page-client, profile-client, session-detail-client); without
    //   this every admin image upload fails with an opaque network error.
    // https://*.sentry.io rather than https://*.ingest.sentry.io -- a CSP
    //   host wildcard is a suffix match, so `*.ingest.sentry.io` matches
    //   `oNNN.ingest.sentry.io` but NOT the regional `oNNN.ingest.us.sentry.io`
    //   form Sentry issues for newer projects, which would silently drop
    //   every browser error report and Session Replay upload.
    //
    //   Note this was NOT what hid the blank-page outage, despite the tempting
    //   story: browser Sentry was not running at all. Its init lived in
    //   sentry.client.config.ts, a filename only @sentry/nextjs's WEBPACK
    //   config reads, and this project builds with Turbopack. It has since
    //   moved to src/instrumentation-client.ts, which Next actually loads --
    //   so this allowlist entry only started mattering once that was fixed.
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
  // Checking both names inline rather than importing better-auth's
  // getSessionCookie(). That helper is correct, but `better-auth/cookies`
  // pulls in `../db/schema` -> `@better-auth/core/db` -> zod, and Turbopack
  // does not shake it out of the middleware bundle: the emitted chunk
  // measured 313KB with 419 zod references, parsed and evaluated on every
  // cold middleware instance, to read one header and do two Map lookups.
  //
  // NextRequest has already parsed the Cookie header into a Map, so this also
  // avoids re-parsing the raw string on every request -- including for `/`,
  // `/gallery` and other paths that never consult the result.
  //
  // Only the `.` separator is checked: the `-` variant getSessionCookie also
  // tries applies to a non-default `cookiePrefix`, and auth.ts sets none.
  // If `advanced.cookiePrefix` or `useSecureCookies` is ever configured,
  // update both names here. Covered by csp.test.ts
  // ("proxy session cookie recognition").
  const sessionToken =
    request.cookies.get('__Secure-better-auth.session_token') ??
    request.cookies.get('better-auth.session_token');
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
  if (protectedPrefixes.some((prefix) => isUnder(pathname, prefix))) {
    if (!sessionToken) {
      // Clone nextUrl rather than resolving against request.url: with
      // `output: 'standalone'` behind a TLS-terminating proxy the two can
      // disagree on protocol/host, and nextUrl is the normalized one.
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = '';
      // No `loginUrl.hash = ''` here, despite looking prudent: fragments are
      // dereferenced client-side and never sent in a request line (RFC 3986
      // 3.5), so nextUrl.hash is always empty and clearing it is a no-op.
      // It would also be counterproductive -- per WHATWG Fetch's
      // HTTP-redirect step, a Location with a NULL fragment is exactly the
      // case where the UA re-applies the original URL's fragment.
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

  // NO auth-page bounce here. Deliberate -- do not re-add one.
  //
  // The obvious companion to the block above is "if the user already has a
  // session cookie, redirect them off /login to /dashboard". That produces an
  // unbreakable redirect loop the moment a cookie is present but the session
  // behind it is not valid -- revoked, expired, user banned via the admin
  // plugin, session row dropped by a db:push, or BETTER_AUTH_SECRET rotated:
  //
  //   GET /dashboard -> proxy sees a cookie, passes through
  //     -> (dashboard)/layout.tsx -> requireAuthSession() finds no session
  //     -> redirect('/login?callbackUrl=/dashboard')
  //   GET /login     -> proxy sees the same cookie -> 303 /dashboard
  //     -> ERR_TOO_MANY_REDIRECTS, with /login unreachable so the user can
  //        never sign in again to clear it. A secret rotation locks out
  //        every user at once.
  //
  // getSessionCookie() only PARSES the jar (better-auth cookies/index.mjs):
  // no HMAC verification, no expiry check, no DB lookup. The proxy therefore
  // cannot tell a live session from a dead one, and deliberately does not try
  // -- validating here would mean a DB round trip on every request.
  //
  // The asymmetry is intentional and safe: the block above is optimistic in
  // the *safe* direction (no cookie -> definitely not signed in -> redirect),
  // while a stale cookie merely gets forwarded to the segment layout, which
  // does the real `auth.api.getSession` check and redirects properly.
  //
  // Sending an already-authenticated user away from /login is handled in
  // src/app/(auth)/layout.tsx, which runs a REAL `auth.api.getSession`
  // lookup and routes on actual role (admin -> /dashboard, else /portal).
  //
  // That placement is what makes it safe: a validated lookup returns "no
  // session" for a stale cookie, so the visitor just gets the login form and
  // the loop above is structurally impossible. A proxy-level bounce cannot
  // reach that answer without a DB round trip on every request.
  //
  // (login/page.tsx does NOT do this -- it is a 'use client' form that only
  // routes inside signIn.email's onSuccess. An earlier revision of this
  // comment claimed otherwise and was wrong; the guard had to be written.)

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
