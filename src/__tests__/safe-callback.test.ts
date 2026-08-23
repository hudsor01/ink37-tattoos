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

/**
 * Regression coverage for the backslash open redirect.
 *
 * The original guard tested only `raw.startsWith('//')`. Per the WHATWG URL
 * Standard, `\` is equivalent to `/` in the authority position of a special
 * scheme, so the parser reads `/\evil.com` exactly like `//evil.com`:
 *
 *   new URL('/\\evil.com', 'https://ink37tattoos.com/login').href
 *     === 'https://evil.com/'      // verified
 *   '/\\evil.com'.startsWith('//') === false
 *
 * A phishing link to /login?callbackUrl=/\evil.com therefore walked the victim
 * through a real sign-in on the real domain before handing them to the
 * attacker, since login/page.tsx assigns the value to window.location.href.
 *
 * The suite above reads as exhaustive ("//", "///", https:, javascript:, data:)
 * which is exactly why the gap survived -- these cases keep it honest.
 */
describe('safeCallbackUrl -- parser-level origin escapes', () => {
  const FALLBACK = '/dashboard';

  it('rejects backslash-authority forms that resolve cross-origin', () => {
    expect(safeCallbackUrl('/\\evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/\\/evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/\\\\evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/\\evil.com/path?a=1', FALLBACK)).toBe(FALLBACK);
  });

  /**
   * Ties the assertion to observable behavior rather than to the shape of the
   * implementation: whatever comes back must never dereference off-origin.
   */
  it('never returns a value that resolves to another origin', () => {
    const ORIGIN = 'https://ink37tattoos.com';
    const hostile = [
      '//evil.com',
      '///evil.com',
      '/\\evil.com',
      '/\\/evil.com',
      '/\\\\evil.com',
      'https://evil.com',
      'javascript:alert(1)',
    ];
    for (const raw of hostile) {
      const out = safeCallbackUrl(raw, FALLBACK);
      expect(new URL(out, `${ORIGIN}/login`).origin).toBe(ORIGIN);
    }
  });

  it('still accepts ordinary same-origin paths unchanged', () => {
    expect(safeCallbackUrl('/dashboard/orders?status=open', FALLBACK)).toBe(
      '/dashboard/orders?status=open'
    );
    expect(safeCallbackUrl('/login-help', FALLBACK)).toBe('/login-help');
  });
});
