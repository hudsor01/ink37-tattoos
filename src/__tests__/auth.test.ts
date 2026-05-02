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
    expect(content).toContain('better-auth.session_token');
  });
});
