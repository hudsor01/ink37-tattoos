/**
 * Validates a `callbackUrl` value (typically pulled from the URL query
 * string) and returns either a normalized same-origin path or the supplied
 * fallback. Used by /login + /register on the client side and by the
 * (dashboard) / (portal) AuthGuards on the server side, so it lives in a pure
 * module with no `server-only` import.
 *
 * Rejects:
 *   - null / undefined / empty
 *   - anything that does not begin with `/`, which covers absolute URLs
 *     (`https://...`) and other schemes (`javascript:`, `data:`)
 *   - protocol-relative URLs (`//evil.com`)
 *   - anything that resolves to a different origin, which covers the
 *     backslash forms (`/\evil.com`, `/\/evil.com`) a `startsWith('//')`
 *     check alone misses
 *   - paths that bounce back to the auth pages, which would loop sign-in
 *
 * Returns the RESOLVED path, never the raw input -- see below.
 *
 * WHY ORIGIN RESOLUTION AND NOT A CHARACTER BLACKLIST:
 * The WHATWG URL Standard treats `\` as equivalent to `/` in the authority
 * position of a special scheme, so the parser reads `/\evil.com` exactly like
 * `//evil.com`:
 *
 *   new URL('/\\evil.com', 'https://ink37tattoos.com/login').href
 *     === 'https://evil.com/'
 *
 * while `'/\\evil.com'.startsWith('//')` is false. Asking the parser whether
 * the value escapes the origin defers to the same algorithm the browser will
 * use at redirect time.
 *
 * WHY IT RETURNS THE NORMALIZED PATH:
 * Validating a parsed value and then returning the raw string means the thing
 * that was checked is not the thing that ships. Three concrete gaps that
 * closed by returning `resolved.pathname + search + hash`:
 *   - `//callback.invalid/x` resolved to the sentinel origin and compared
 *     equal, so an origin-only check handed it back verbatim -- and the raw
 *     `//host/x` is protocol-relative when the browser dereferences it.
 *   - `/foo\r\nX-Injected: 1` survived intact, because the parser strips
 *     \t\n\r before validating. Harmless while every consumer
 *     encodeURIComponent()s it, but the first one that puts the value in a
 *     Location or Set-Cookie header gets response splitting.
 *   - `/\evil.com` was rejected, but only because of the origin check; the
 *     normalized form is unambiguous regardless.
 */

/** Sentinel origin used only to resolve relative values for validation.
 *  `.invalid` is reserved by RFC 2606 and can never be a real host. */
const SENTINEL_ORIGIN = 'https://callback.invalid';

/**
 * Auth pages a callbackUrl must never point at, or sign-in loops.
 *
 * Exported so (auth)/layout.tsx's "already signed in" redirect gates exactly
 * these paths. The same group also holds /forgot-password and
 * /reset-password, which must stay reachable while signed in -- a user
 * clicking an emailed reset link still has a live session, and bouncing them
 * consumes nothing and expires the single-use token.
 */
export const AUTH_PATHS = ['/login', '/register'];

export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  // Protocol-relative. Cheap, and independent of the sentinel comparison
  // below (which cannot distinguish `//callback.invalid/x` from a real path).
  if (raw.startsWith('//')) return fallback;

  let resolved: URL;
  try {
    // Resolve from an auth-page path so the result mirrors how the value
    // will actually be dereferenced at redirect time.
    resolved = new URL(raw, `${SENTINEL_ORIGIN}/login`);
  } catch {
    return fallback;
  }

  // Anything the parser pulls off the sentinel origin is an open redirect.
  if (resolved.origin !== SENTINEL_ORIGIN) return fallback;

  const out = `${resolved.pathname}${resolved.search}${resolved.hash}`;

  // THE load-bearing check: the hazard is in the OUTPUT, not the input.
  //
  // Dot segments let a value stay on the sentinel origin while resolving to a
  // pathname that is itself protocol-relative. Verified:
  //
  //   new URL('/..//evil.com', 'https://callback.invalid/login')
  //     -> origin 'https://callback.invalid'  (passes the check above)
  //        pathname '//evil.com'              (protocol-relative!)
  //
  // and `'/..//evil.com'.startsWith('//')` is false, so an input-side guard
  // never sees it. Returning that pathname hands the caller `//evil.com`,
  // which dereferences to https://evil.com/ the moment it reaches
  // window.location.href. `/.//`, `/a/..//`, `/%2e%2e//` and `/..///` all do
  // the same. `/..//` degenerates to `'//'`, which throws Invalid URL in any
  // consumer that re-parses it.
  //
  // Checking the resolved output covers every one of those, and subsumes the
  // input-side check above.
  if (out.startsWith('//')) return fallback;

  // Compare case-insensitively and ignore a trailing slash: `/login/` and
  // `/LOGIN` are the same loop, while `/login-help` and `/registered-users`
  // are legitimate destinations and must survive (hence no prefix test).
  const normalizedPath = resolved.pathname.replace(/\/+$/, '').toLowerCase();
  if (AUTH_PATHS.includes(normalizedPath || '/')) return fallback;

  return out;
}
