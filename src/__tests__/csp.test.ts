import { describe, it, expect, vi } from 'vitest';

// The global setup.ts partially mocks next/server (after, connection,
// NextResponse.json). For these tests we need the real NextRequest +
// NextResponse classes -- restore the actual module for this file only.
vi.mock('next/server', async () => await vi.importActual('next/server'));

import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';

/**
 * Phase 30: CSP nonce + Content-Security-Policy header tests.
 * Mirrors the Task 1 acceptance criteria from
 * .planning/phases/30-csp-nonce-implementation/30-01-PLAN.md.
 */

function parseCSP(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split('; ').map((d) => {
      const [name, ...rest] = d.split(' ');
      return [name, rest.join(' ')];
    })
  );
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

  it('script-src includes strict-dynamic and Cal.com', () => {
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['script-src']).toContain("'strict-dynamic'");
    expect(csp['script-src']).toContain('https://app.cal.com');
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
    expect(csp['connect-src']).toContain('https://*.ingest.sentry.io');
    expect(csp['connect-src']).toContain('https://app.cal.com');
    expect(csp['connect-src']).toContain('https://api.cal.com');
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

  it('connect-src includes ws://localhost:* in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const res = proxy(makeRequest('/'));
    const csp = parseCSP(res.headers.get('content-security-policy'));
    expect(csp['connect-src']).toContain('ws://localhost:*');
    vi.unstubAllEnvs();
  });
});
