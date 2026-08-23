import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Env stubs are unwound here, not at the end of each test body. vitest.config
 * sets no `unstubEnvs` and setup.ts has no afterEach, so a stubEnv call
 * followed by a FAILING expect never reached its trailing
 * vi.unstubAllEnvs() -- leaking NODE_ENV into every later test in the worker
 * and turning one red test into a cascade of unrelated ones.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

// The global setup.ts partially mocks next/server (after, connection,
// NextResponse.json). For these tests we need the real NextRequest +
// NextResponse classes -- restore the actual module for this file only.
vi.mock('next/server', async () => await vi.importActual('next/server'));

import { NextRequest } from 'next/server';
// Next's real nonce extractor, so the delivery test exercises the same code
// that runs in app-render rather than a re-implementation. Internal path: if a
// future Next minor moves it, this import fails loudly instead of silently
// asserting nothing.
import { getScriptNonceFromHeader } from 'next/dist/server/app-render/get-script-nonce-from-header';
import { proxy } from '../proxy';

/**
 * Phase 30: CSP nonce + Content-Security-Policy header tests.
 * Mirrors the Task 1 acceptance criteria from
 * .planning/phases/30-csp-nonce-implementation/30-01-PLAN.md.
 */

/**
 * Parses a CSP header into a directive map.
 *
 * Keeps the FIRST occurrence of a duplicated directive, because that is what
 * browsers enforce (CSP3: a policy with repeated directives ignores all but
 * the first). The obvious `Object.fromEntries(...)` spelling keeps the LAST,
 * which inverts the meaning of every assertion built on it -- e.g.
 * `"script-src 'self'; script-src 'none'"` would report `'none'` when the
 * browser is actually enforcing `'self'`.
 */
function parseCSP(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const directive of header.split(';')) {
    const [name, ...rest] = directive.trim().split(' ');
    if (!name) continue;
    if (name in out) continue; // first wins, as browsers do
    out[name] = rest.join(' ');
  }
  return out;
}

/**
 * Does a CSP source-list actually authorize `host`?
 *
 * Implements CSP3 host-part matching: a leading `*.` is a SUFFIX match, so
 * `*.example.com` authorizes `a.example.com` and `a.b.example.com`, but
 * `*.ingest.sentry.io` does NOT authorize `o1.ingest.us.sentry.io` -- that
 * host ends in `.us.sentry.io`. Getting this wrong is how the old Sentry
 * entry silently dropped every browser error report from regional projects.
 */
function cspAllowsHost(sourceList: string | undefined, host: string): boolean {
  if (!sourceList) return false;
  return sourceList.split(/\s+/).some((source) => {
    const bare = source.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    if (!bare) return false;
    if (bare.startsWith('*.')) return host.endsWith(bare.slice(1));
    return host === bare;
  });
}

function makeRequest(path = '/', cookie = ''): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: new Headers(cookie ? { cookie } : {}),
  });
}

describe('proxy CSP + nonce', () => {
  it('sets a Content-Security-Policy header with a nonce in script-src', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  });

  it('sets the x-nonce request header for downstream server components', () => {
    // Next.js exposes request headers set via NextResponse.next({ request: { headers } })
    // back to the caller as `x-middleware-request-${headerName}` on the response.
    // This is an internal Next.js convention (see node_modules/next/dist/esm/server/
    // web/spec-extension/response.js -- search for x-middleware-request). If the
    // convention name changes in a future Next.js minor, update the sentinel below.
    const res = proxy(makeRequest('/'));
    const sentinel = res.headers.get('x-middleware-request-x-nonce');
    expect(sentinel).toBeTruthy();
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).toContain(`'nonce-${sentinel}'`);
  });

  /**
   * Regression guard for the nonce delivery mechanism.
   *
   * Next.js does not invent a nonce -- it reads one off the *request*
   * Content-Security-Policy header and applies it to the inline scripts it
   * renders (see app-render.js: `headers['content-security-policy']` ->
   * `getScriptNonceFromHeader`). proxy.ts setting that header on
   * requestHeaders is therefore load-bearing, not informational.
   *
   * If it is ever dropped, Next emits those inline scripts with no nonce
   * attribute and the response-side policy blocks them -- next-themes' theme
   * bootstrap stops executing, and so do React's boundary-completion scripts
   * that swap streamed Suspense content into place.
   *
   * Not the JSON-LD blocks: a <script> whose type is not a JS MIME type is a
   * data block, and HTML's "prepare the script element" returns at type
   * determination, before the CSP inline check -- so script-src never applies
   * to application/ld+json. json-ld.tsx carries no nonce for that reason.
   */
  it('forwards the CSP on the request so Next can extract the nonce', () => {
    const res = proxy(makeRequest('/'));
    const forwarded = res.headers.get(
      'x-middleware-request-content-security-policy'
    );
    expect(forwarded).toBeTruthy();

    const nonce = res.headers.get('x-middleware-request-x-nonce');
    expect(forwarded).toContain(`'nonce-${nonce}'`);

    // Run Next's ACTUAL extractor over the header rather than re-implementing
    // it. The previous spelling asserted the nonce matched
    // /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/, which cannot fail:
    // Buffer.from(crypto.randomUUID()).toString('base64') encodes only the
    // bytes [0-9a-f-], so sextets never reach index 62/63 and the 36-byte
    // input is divisible by 3 -- the output is always exactly [A-Za-z0-9]{48},
    // a strict subset of that class, with no '+', '/' or '='. It also skipped
    // Next's directive-selection and default-src fallback logic entirely.
    expect(getScriptNonceFromHeader(forwarded!)).toBe(nonce);
  });

  it('script-src allows self and Cal.com', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).toContain("'self'");
    expect(csp['script-src']).toContain('https://app.cal.com');
  });

  /**
   * Regression guard: `'strict-dynamic'` took the entire public site down.
   *
   * Per CSP Level 3, `'strict-dynamic'` makes the browser ignore every
   * host-source expression in script-src -- both `'self'` and
   * `https://app.cal.com` go inert, leaving only nonce'd/hashed scripts.
   * But `cacheComponents: true` (Cache Components / PPR) means each route
   * ships a statically prerendered shell whose `/_next/static/chunks/*.js`
   * bootstrap tags are emitted at build time and therefore carry no nonce.
   * Next's docs state the incompatibility directly: "Partial Prerendering
   * (PPR) is also incompatible with nonce-based CSP because static shell
   * scripts cannot access the nonce."
   *
   * Result in production: every chunk downloaded, none executed, React never
   * hydrated, and PageTransition stayed pinned at its SSR'd `opacity: 0` --
   * a completely blank site with a fully-formed DOM. The Cal.com booking
   * embed was silently blocked by the same rule.
   *
   * Re-adding `'strict-dynamic'` is only safe if PPR/ISR is fully disabled
   * (`await connection()` on every page). Until then, this must stay absent.
   */
  it('script-src does NOT contain strict-dynamic (blank-page regression)', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).not.toContain("'strict-dynamic'");
  });

  /**
   * Checks the WHOLE policy, not just the parsed `script-src` key.
   *
   * `'strict-dynamic'` reproduces the outage from any script-governing
   * directive: `script-src-elem` overrides `script-src` for element-inserted
   * scripts, and `default-src` applies when `script-src` is absent. A guard
   * that reads one key would stay green while the site is blank again.
   */
  it('no script-governing directive reintroduces strict-dynamic', () => {
    const header = proxy(makeRequest('/')).headers.get(
      'content-security-policy'
    );
    expect(header).toBeTruthy();
    expect(header).not.toContain('strict-dynamic');

    const csp = parseCSP(header);
    for (const directive of ['script-src', 'script-src-elem', 'default-src']) {
      expect(csp[directive] ?? '').not.toContain("'strict-dynamic'");
    }
  });

  it('script-src does NOT contain unsafe-inline or unsafe-eval in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).not.toContain("'unsafe-inline'");
    expect(csp['script-src']).not.toContain("'unsafe-eval'");
    vi.unstubAllEnvs();
  });

  it('script-src contains unsafe-eval in development for HMR', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).toContain("'unsafe-eval'");
    vi.unstubAllEnvs();
  });

  it('connect-src includes Sentry and Cal.com endpoints', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['connect-src']).toContain('https://*.sentry.io');
    expect(csp['connect-src']).toContain('https://app.cal.com');
    expect(csp['connect-src']).toContain('https://api.cal.com');
  });

  /**
   * A CSP host wildcard is a suffix match, so `*.ingest.sentry.io` covers
   * `oNNN.ingest.sentry.io` but NOT the regional `oNNN.ingest.us.sentry.io`
   * form Sentry issues for newer projects -- silently dropping every browser
   * error report and Session Replay upload. `*.sentry.io` covers both.
   */
  it('connect-src covers regional Sentry ingest hosts', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));

    // Assert against the ACTUAL emitted directive. The previous version of
    // this test derived a suffix from its own string literal and asserted
    // three hardcoded hostnames ended with it -- a property of
    // String.endsWith that held no matter what buildCSP emitted, so deleting
    // Sentry from connect-src entirely left it green.
    for (const host of [
      'o1.ingest.sentry.io',
      'o1.ingest.us.sentry.io',
      'o1.ingest.de.sentry.io',
    ]) {
      expect(cspAllowsHost(csp['connect-src'], host)).toBe(true);
    }
  });

  /**
   * @vercel/blob's client-side upload() POSTs to https://vercel.com/api/blob.
   * Five dashboard components call it; omitting the host fails every admin
   * image upload with an opaque network error.
   */
  it('connect-src allows the Vercel Blob client upload endpoint', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['connect-src']).toContain('https://vercel.com');
  });

  /**
   * contact-client.tsx embeds a Google Maps iframe for the studio location.
   * frame-src must allow it or the map renders as an empty bordered box.
   */
  it('frame-src allows the Google Maps embed used on /contact', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['frame-src']).toContain('https://www.google.com');
    expect(csp['frame-src']).toContain('https://app.cal.com');
  });

  it('style-src includes unsafe-inline (Next.js inline styles)', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['style-src']).toContain("'unsafe-inline'");
  });

  it('object-src is none and frame-ancestors is none', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['object-src']).toBe("'none'");
    expect(csp['frame-ancestors']).toBe("'none'");
  });

  it('auth redirect responses also include Content-Security-Policy', () => {
    const res = proxy(makeRequest('/dashboard'));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('generates a different nonce per call (no reuse)', () => {
    const a = parseCSP(proxy(makeRequest('/')).headers.get('content-security-policy'));
    const b = parseCSP(proxy(makeRequest('/')).headers.get('content-security-policy'));
    expect(a['script-src']).not.toBe(b['script-src']);
  });

  /**
   * Dev uses bare ws:/wss: scheme-sources, not `ws://localhost:*`.
   * next.config.ts's allowedDevOrigins permits LAN, Tailscale CGNAT, MagicDNS
   * and Cloudflare-tunnelled dev hosts; a localhost-only connect-src blocks
   * the HMR websocket from all of them, so the dev server loads but hot
   * reload is silently dead.
   */
  it('connect-src allows dev websockets from non-localhost origins', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['connect-src']).toContain('ws:');
    expect(csp['connect-src']).toContain('wss:');
    vi.unstubAllEnvs();
  });

  it('connect-src has no websocket sources in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['connect-src']).not.toContain('ws:');
    expect(csp['connect-src']).not.toContain('wss:');
  });

  /**
   * The dev branch must be opt-IN on NODE_ENV === 'development', never
   * opt-OUT on !== 'production'.
   *
   * Stubbing 'production' proves nothing on its own: vitest already runs at
   * NODE_ENV='test', where `isDev` is false, so those assertions pass
   * identically whether the predicate is `=== 'development'` or
   * `!== 'production'`. Flipping it to the latter -- a plausible "make
   * preview builds behave like dev" edit -- would ship 'unsafe-eval' and bare
   * ws:/wss: from any deployment whose NODE_ENV is not literally
   * 'production' (self-hosted `node server.js` with NODE_ENV unset, a
   * Docker/standalone run, a CI smoke env), with CI reporting full coverage.
   *
   * These values exercise that gap directly.
   */
  it.each(['test', 'preview', 'staging', ''])(
    'treats NODE_ENV=%o as production-like (no dev-only sources)',
    (env) => {
      vi.stubEnv('NODE_ENV', env);
      const csp = parseCSP(
        proxy(makeRequest('/')).headers.get('content-security-policy')
      );
      expect(csp['script-src']).not.toContain("'unsafe-eval'");
      expect(csp['script-src']).not.toContain('va.vercel-scripts.com');
      expect(csp['connect-src']).not.toContain('ws:');
      expect(csp['connect-src']).not.toContain('wss:');
    }
  );
});

describe('proxy x-pathname forwarding', () => {
  /**
   * AuthGuards in (dashboard) and (portal) read x-pathname from the
   * request headers to build a callbackUrl that lands the user back
   * on the page they tried to visit. proxy.ts must forward the full
   * pathname + search (so query state survives the auth flow).
   *
   * Tests use the same x-middleware-request- sentinel convention as
   * the x-nonce test above. If a future refactor of proxy.ts drops
   * the requestHeaders.set('x-pathname', ...) line, these tests fail
   * loudly instead of letting the AuthGuards silently fall back.
   */
  it('forwards the request pathname on x-pathname', () => {
    // Use a non-protected path so the proxy returns NextResponse.next()
    // (which carries the x-middleware-request-* sentinel) rather than a
    // 302 redirect (which doesn't expose request headers back to the test).
    const res = proxy(makeRequest('/gallery/japanese'));
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe(
      '/gallery/japanese'
    );
  });

  it('includes search params so query state survives the auth round-trip', () => {
    const res = proxy(makeRequest('/gallery?style=realism&page=2'));
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe(
      '/gallery?style=realism&page=2'
    );
  });

  it('forwards the root path as "/"', () => {
    const res = proxy(makeRequest('/'));
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe('/');
  });

  it('uses the path+search variant in the protected-route redirect callbackUrl', () => {
    // Unauthenticated /dashboard hit should redirect to /login with the
    // full pathname (no search here, but verify the param is present).
    const res = proxy(makeRequest('/dashboard'));
    expect(res.status).toBe(303);
    const location = res.headers.get('location');
    expect(location).toContain('callbackUrl=%2Fdashboard');
  });
});

/**
 * The JsonLd </script>-escape tests used to live here. They declared a private
 * `safeStringify()` copy of the transformation and never imported the
 * component, so they asserted a property of this file: deleting
 * `.replace(/</g, '\\u003c')` from json-ld.tsx left them green while every
 * <JsonLd> became a </script> breakout vector.
 *
 * They now render the real component in json-ld.test.tsx, and are verified to
 * fail when the escape is removed.
 */

describe('proxy session cookie recognition', () => {
  const SECURE = '__Secure-better-auth.session_token=abc123';
  const BARE = 'better-auth.session_token=abc123';

  it('treats the production __Secure- prefixed cookie as authenticated', () => {
    const res = proxy(makeRequest('/dashboard', SECURE));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('treats the local-dev unprefixed cookie as authenticated', () => {
    const res = proxy(makeRequest('/dashboard', BARE));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('still redirects to /login when no session cookie is present', () => {
    const res = proxy(makeRequest('/dashboard'));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('protects /portal with the production cookie name too', () => {
    expect(proxy(makeRequest('/portal', SECURE)).status).toBe(200);
    expect(proxy(makeRequest('/portal')).status).toBe(303);
  });

  /**
   * Regression guard for an unbreakable redirect loop.
   *
   * The proxy must NOT bounce a cookie-bearing request off /login.
   * getSessionCookie() only parses the jar -- no HMAC verify, no expiry, no
   * DB lookup -- so a cookie whose session is revoked, expired, banned,
   * dropped by a db:push, or invalidated by a BETTER_AUTH_SECRET rotation
   * still reads as "present". With a bounce in place:
   *
   *   GET /dashboard -> proxy passes (cookie present)
   *     -> layout requireAuthSession() finds no session -> /login?callbackUrl=
   *   GET /login     -> proxy bounces back to /dashboard
   *     -> ERR_TOO_MANY_REDIRECTS, /login unreachable, user permanently
   *        locked out with no way to clear the cookie.
   *
   * Routing an authenticated user away from /login belongs in
   * login/page.tsx, which reads a validated session and routes on real role.
   */
  it('does NOT bounce a cookie-bearing request off /login (loop guard)', () => {
    const res = proxy(makeRequest('/login', SECURE));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does NOT bounce a cookie-bearing request off /register', () => {
    expect(proxy(makeRequest('/register', SECURE)).status).toBe(200);
  });

  /**
   * A stale cookie must reach the segment layout, which performs the real
   * session check -- that is the only place the loop can be broken.
   */
  it('forwards a stale-cookie /dashboard request to the layout, not a redirect', () => {
    const res = proxy(makeRequest('/dashboard', 'better-auth.session_token=stale'));
    expect(res.status).toBe(200);
  });

  /**
   * Segment-boundary matching: a public route that merely shares a prefix
   * must not be pulled behind the auth gate. safe-callback.ts exact-matches
   * for the same reason (/login-help, /registered-users).
   */
  it('does not gate routes that merely share a prefix', () => {
    expect(proxy(makeRequest('/dashboardxyz')).status).toBe(200);
    expect(proxy(makeRequest('/portal-info')).status).toBe(200);
    // ...while real segments stay gated.
    expect(proxy(makeRequest('/dashboard')).status).toBe(303);
    expect(proxy(makeRequest('/dashboard/orders')).status).toBe(303);
  });
});
