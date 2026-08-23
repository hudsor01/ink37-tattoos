import { describe, it, expect } from 'vitest';

describe('Auth configuration', () => {
  it('auth.ts exports betterAuth config with admin plugin', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/auth.ts', 'utf-8');
    expect(content).toContain('betterAuth');
    expect(content).toContain("admin(");
    expect(content).toContain('emailAndPassword');
    expect(content).toContain('getCurrentSession');
  });

  it('auth-client.ts exports client with admin plugin', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/auth-client.ts', 'utf-8');
    expect(content).toContain('createAuthClient');
    expect(content).toContain('adminClient');
    expect(content).toContain('signIn');
    expect(content).toContain('signOut');
    expect(content).toContain('useSession');
  });

  it('auth route handler exports GET and POST', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/app/api/auth/[...all]/route.ts', 'utf-8');
    expect(content).toContain('toNextJsHandler');
    expect(content).toContain('GET');
    expect(content).toContain('POST');
  });

  it('proxy.ts protects dashboard and portal routes', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/proxy.ts', 'utf-8');
    expect(content).toContain('export function proxy');
    expect(content).toContain('/dashboard');
    expect(content).toContain('/portal');
  });

  /**
   * This assertion used to read `expect(content).toContain(
   * 'better-auth.session_token')`, which pinned a production outage in place.
   *
   * Better Auth prefixes the cookie with `__Secure-` whenever baseURL is
   * https, so the real production cookie is
   * `__Secure-better-auth.session_token`. proxy.ts was doing an exact
   * `request.cookies.get('better-auth.session_token')`, which never matched
   * in production -- every signed-in user read as logged out and /dashboard
   * and /portal became an infinite redirect loop. The old assertion demanded
   * the broken literal stay in the file, so fixing the bug would have failed
   * the suite.
   *
   * Asserting on the helper instead: getSessionCookie() checks prefixed and
   * bare names and both separators. Behavioral coverage of the actual
   * redirect decisions lives in csp.test.ts
   * ("proxy session cookie recognition").
   */
  /**
   * Intentionally NOT a source-text assertion.
   *
   * The previous spelling here asserted the proxy source *contained*
   * 'better-auth.session_token', which pinned a production outage in place:
   * Better Auth prefixes the cookie with `__Secure-` whenever baseURL is
   * https, so the exact-name lookup never matched in production and every
   * signed-in user read as logged out. Fixing it would have failed the suite.
   *
   * The obvious repair -- strip comments, then regex the code -- is also
   * unsound, and was tried. `.replace(/\/\*[\s\S]*?\*\//g, '')` treats the
   * `/*` inside `https://*.public.blob.vercel-storage.com` as a block-comment
   * opener and swallows everything to the next block-comment close: 220
   * lines in, 143 out,
   * with connect-src, frame-src, frame-ancestors and form-action all silently
   * gone. Any `https://*` added to the policy shifts what the guard can even
   * see. A positive `toContain('getSessionCookie')` is no better -- it passes
   * on the import and the explanatory comment alone, even with the real call
   * deleted.
   *
   * Grepping source text cannot express this contract. The real coverage is
   * behavioral, in csp.test.ts ("proxy session cookie recognition"): it drives
   * proxy() with the production `__Secure-` cookie, the dev bare cookie, a
   * stale cookie and no cookie, and asserts the actual redirect decisions.
   * Verified to fail on the exact-name lookup.
   */
  it('proxy.ts still exports the proxy entrypoint', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/proxy.ts', 'utf-8');
    expect(content).toContain('export function proxy');
  });
});
