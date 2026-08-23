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
   * There is deliberately NO source-text assertion about the session cookie
   * name here.
   *
   * This slot used to hold `expect(content).toContain(
   * 'better-auth.session_token')`, which pinned a production outage in place:
   * Better Auth prefixes the cookie with `__Secure-` whenever baseURL is
   * https, so that exact-name lookup never matched in production, every
   * signed-in user read as logged out, and fixing it would have failed the
   * suite.
   *
   * The obvious repair -- strip comments, then regex the code -- is also
   * unsound, and was tried. A block-comment strip treats the two characters
   * that open a block comment -- which appear inside
   * `https://*.public.blob.vercel-storage.com` -- as a real opener and
   * swallows everything to the next close: 220 lines in, 143 out, with
   * connect-src, frame-src, frame-ancestors and form-action silently gone.
   * Any `https://*` added to the policy shifts what such a guard can even
   * see. A positive `toContain('getSessionCookie')` was no better -- it
   * passed on the import and the explanatory comment alone, even with the
   * real call deleted.
   *
   * Grepping source text cannot express this contract. The real coverage is
   * behavioral, in csp.test.ts ("proxy session cookie recognition"): it
   * drives proxy() with the production `__Secure-` cookie, the dev bare
   * cookie, a stale cookie and no cookie, and asserts the actual redirect
   * decisions. Verified to fail on the exact-name lookup.
   */
});
