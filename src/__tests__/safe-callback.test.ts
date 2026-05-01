import { describe, it, expect } from 'vitest';
import { safeCallbackUrl } from '@/lib/safe-callback';

/**
 * Security-sensitive helper. Used by /login and the (dashboard) /
 * (portal) AuthGuards to validate any URL pulled from a query param or
 * forwarded request header before it lands in window.location.href or
 * a redirect Location. A regression here is a real open-redirect bug,
 * so the test surface is exhaustive on purpose.
 */
describe('safeCallbackUrl', () => {
  const FALLBACK = '/dashboard';

  it('returns the fallback for null/undefined/empty', () => {
    expect(safeCallbackUrl(null, FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('', FALLBACK)).toBe(FALLBACK);
  });

  it('accepts same-origin paths starting with a single slash', () => {
    expect(safeCallbackUrl('/dashboard/orders', FALLBACK)).toBe('/dashboard/orders');
    expect(safeCallbackUrl('/portal', FALLBACK)).toBe('/portal');
    expect(safeCallbackUrl('/', FALLBACK)).toBe('/');
  });

  it('preserves query strings on accepted paths', () => {
    expect(safeCallbackUrl('/dashboard/orders?status=open&page=2', FALLBACK)).toBe(
      '/dashboard/orders?status=open&page=2'
    );
  });

  it('rejects protocol-relative URLs (open redirect vector)', () => {
    expect(safeCallbackUrl('//evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('//evil.com/path', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('///evil.com', FALLBACK)).toBe(FALLBACK);
  });

  it('rejects absolute URLs', () => {
    expect(safeCallbackUrl('https://evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('http://evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('javascript:alert(1)', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('data:text/html,<script>alert(1)</script>', FALLBACK)).toBe(FALLBACK);
  });

  it('rejects /login and /register so the auth flow cannot loop', () => {
    expect(safeCallbackUrl('/login', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/register', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/login?callbackUrl=/dashboard', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/register?ref=email', FALLBACK)).toBe(FALLBACK);
  });

  it('does NOT reject paths that merely start with /login-something', () => {
    // /login-help is a hypothetical legit page; only exact /login or
    // /login? should be filtered. Guard against an over-eager prefix
    // match regression.
    expect(safeCallbackUrl('/login-help', FALLBACK)).toBe('/login-help');
    expect(safeCallbackUrl('/registered-users', FALLBACK)).toBe('/registered-users');
  });

  it('rejects values that do not start with a slash', () => {
    expect(safeCallbackUrl('dashboard', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('foo/bar', FALLBACK)).toBe(FALLBACK);
  });

  it('uses the supplied fallback rather than a hardcoded default', () => {
    expect(safeCallbackUrl(null, '/portal')).toBe('/portal');
    expect(safeCallbackUrl('//evil.com', '/portal')).toBe('/portal');
  });
});
