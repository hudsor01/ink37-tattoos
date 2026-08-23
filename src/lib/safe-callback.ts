/**
 * Validates a `callbackUrl` value (typically pulled from the URL query
 * string) and returns either the original value or the supplied
 * fallback. Used by /login + /register on the client side and by the
 * (dashboard) / (portal) AuthGuards on the server side, so it lives in
 * a pure module with no `server-only` import.
 *
 * Rejects:
 *   - null / undefined / empty
 *   - anything that does not begin with `/`, which covers absolute URLs
 *     (`https://...`) and other schemes (`javascript:`, `data:`)
 *   - anything that resolves to a different origin, which covers
 *     protocol-relative URLs (`//evil.com`) AND the backslash forms
 *     (`/\evil.com`, `/\/evil.com`) that a plain `startsWith('//')`
 *     check misses -- see below
 *   - paths that bounce back to the auth pages (`/login`, `/register`),
 *     which would create a sign-in loop
 *
 * Accepts: any value starting with a single `/` that resolves same-origin
 * and is not exactly /login or /register (with or without a query
 * string). Accepted values are returned verbatim.
 *
 * WHY ORIGIN RESOLUTION AND NOT A CHARACTER BLACKLIST:
 * The WHATWG URL Standard treats `\` as equivalent to `/` in the
 * authority position of a special scheme (http/https). So the parser
 * reads `/\evil.com` exactly like `//evil.com`:
 *
 *   new URL('/\\evil.com', 'https://ink37tattoos.com/login').href
 *     === 'https://evil.com/'
 *
 * while `'/\\evil.com'.startsWith('//')` is false. The previous
 * implementation checked only the literal `//` prefix, so a link to
 * /login?callbackUrl=/\evil.com walked the victim through a genuine
 * sign-in on the real domain and then handed them to the attacker
 * (login/page.tsx assigns this value to window.location.href and also
 * passes it to Better Auth as callbackURL).
 *
 * Asking the URL parser whether the value escapes the origin defers to
 * the same algorithm the browser will use at redirect time, so it stays
 * correct for encoding tricks a hand-written blacklist would miss.
 */

/** Sentinel origin used only to resolve relative values for validation.
 *  `.invalid` is reserved by RFC 2606 and can never be a real host. */
const SENTINEL_ORIGIN = 'https://callback.invalid';

export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;

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

  // Exact match only -- /login-help and /registered-users are legitimate
  // destinations and must not be caught by a prefix test.
  if (resolved.pathname === '/login' || resolved.pathname === '/register') {
    return fallback;
  }

  return raw;
}
