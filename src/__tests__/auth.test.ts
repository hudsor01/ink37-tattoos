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
  it('proxy.ts reads the session cookie via Better Auth, not an exact name', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/proxy.ts', 'utf-8');
    expect(content).toContain('getSessionCookie');

    // Strip comments before pattern-matching. proxy.ts documents the old
    // broken call inline to explain the outage, and a naive scan of the raw
    // file matches that prose -- the same class of false positive that let
    // the previous `toContain('better-auth.session_token')` assertion pass
    // for the wrong reason.
    const code = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(
      /cookies\.get\(\s*['"]better-auth\.session_token['"]\s*\)/
    );
  });
});
