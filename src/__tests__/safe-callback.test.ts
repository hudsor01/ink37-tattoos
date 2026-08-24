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

/**
 * The validator parses the input but must not hand back the RAW string --
 * otherwise the value that was checked is not the value that ships.
 */
describe('safeCallbackUrl -- returns the normalized path, not raw input', () => {
  const FALLBACK = '/dashboard';

  /**
   * The sentinel origin used internally for resolution is itself a host, so
   * an origin-only comparison accepted URLs pointing AT it. `//host/x` is
   * protocol-relative when the browser dereferences it.
   */
  it('rejects protocol-relative URLs aimed at the internal sentinel host', () => {
    expect(safeCallbackUrl('//callback.invalid/x', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('//callback.invalid', FALLBACK)).toBe(FALLBACK);
  });

  /**
   * The WHATWG parser strips \t\n\r before validating, so a raw passthrough
   * kept CRLF intact. Harmless while consumers encodeURIComponent it, but the
   * first consumer to put it in a Location or Set-Cookie header gets response
   * splitting.
   */
  it('strips CR/LF so the value can never split a header', () => {
    const out = safeCallbackUrl('/foo\r\nX-Injected: 1', FALLBACK);
    expect(out).not.toMatch(/[\r\n]/);
  });

  it('treats /login/ and /LOGIN as the auth-loop paths they are', () => {
    expect(safeCallbackUrl('/login/', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/LOGIN', FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackUrl('/Register/', FALLBACK)).toBe(FALLBACK);
    // ...without catching legitimate lookalikes.
    expect(safeCallbackUrl('/login-help', FALLBACK)).toBe('/login-help');
  });

  it('preserves path, query and hash on accepted values', () => {
    expect(safeCallbackUrl('/dashboard/orders?status=open#top', FALLBACK)).toBe(
      '/dashboard/orders?status=open#top'
    );
  });

  /**
   * Behavioral invariant, independent of implementation shape: whatever comes
   * back must dereference same-origin AND must itself pass revalidation.
   */
  it('output is always same-origin and idempotent under revalidation', () => {
    const ORIGIN = 'https://ink37tattoos.com';
    const inputs = [
      '//evil.com', '///evil.com', '/\\evil.com', '/\\/evil.com',
      '//callback.invalid/x', 'https://evil.com', 'javascript:alert(1)',
      '/dashboard/orders?a=1', '/login', '/foo\r\nX: 1', '/',
    ];
    for (const raw of inputs) {
      const out = safeCallbackUrl(raw, FALLBACK);
      expect(new URL(out, `${ORIGIN}/login`).origin).toBe(ORIGIN);
      expect(safeCallbackUrl(out, FALLBACK)).toBe(out);
    }
  });
});

/**
 * Dot-segment escapes.
 *
 * These stay on the sentinel origin (so an origin-only check passes) while
 * resolving to a pathname that is ITSELF protocol-relative:
 *
 *   new URL('/..//evil.com', 'https://callback.invalid/login')
 *     -> origin  'https://callback.invalid'   (passes)
 *        pathname '//evil.com'                (hazard)
 *
 * and `'/..//evil.com'.startsWith('//')` is false, so an input-side guard
 * never sees them. Returning that pathname is a live open redirect.
 */
describe('safeCallbackUrl -- dot-segment protocol-relative escapes', () => {
  const FALLBACK = '/dashboard';

  it.each([
    '/..//evil.com',
    '/.//evil.com',
    '/a/..//evil.com',
    '/%2e%2e//evil.com',
    '/..///evil.com',
    '/../..//evil.com',
  ])('rejects %o', (raw) => {
    expect(safeCallbackUrl(raw, FALLBACK)).toBe(FALLBACK);
  });

  it('rejects the degenerate /..// which would otherwise return "//"', () => {
    expect(safeCallbackUrl('/..//', FALLBACK)).toBe(FALLBACK);
  });

  /**
   * Property test over the whole hostile corpus. Anything returned must:
   *   - never be protocol-relative
   *   - dereference same-origin
   *   - be re-parseable (no Invalid URL in a downstream consumer)
   *   - be idempotent under revalidation
   */
  it('output is never protocol-relative, always same-origin and re-parseable', () => {
    const ORIGIN = 'https://ink37tattoos.com';
    const hostile = [
      '//evil.com', '///evil.com', '/\\evil.com', '/\\/evil.com',
      '/..//evil.com', '/.//evil.com', '/a/..//evil.com', '/%2e%2e//evil.com',
      '/..///evil.com', '/..//', '/../..//evil.com', '//callback.invalid/x',
      'https://evil.com', 'javascript:alert(1)', '/foo\r\nX: 1',
      '/dashboard/orders?a=1#f', '/', '/login', '/login-help',
    ];
    for (const raw of hostile) {
      const out = safeCallbackUrl(raw, FALLBACK);
      expect(out.startsWith('//')).toBe(false);
      expect(() => new URL(out, `${ORIGIN}/login`)).not.toThrow();
      expect(new URL(out, `${ORIGIN}/login`).origin).toBe(ORIGIN);
      expect(safeCallbackUrl(out, FALLBACK)).toBe(out);
    }
  });
});
