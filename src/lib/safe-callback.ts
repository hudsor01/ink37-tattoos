/**
 * Validates a `callbackUrl` value (typically pulled from the URL query
 * string) and returns either the original value or the supplied
 * fallback. Used by /login + /register on the client side and by the
 * (dashboard) / (portal) AuthGuards on the server side, so it lives in
 * a pure module with no `server-only` import.
 *
 * Rejects:
 *   - null / undefined / empty
 *   - protocol-relative URLs (`//evil.com`) — these become `https://evil.com`
 *     when assigned to `window.location.href`, an open-redirect vector
 *   - absolute URLs (`http://...`, `https://...`, `javascript:...`)
 *   - paths that bounce back to the auth pages (`/login`, `/register`),
 *     which would create a sign-in loop
 *
 * Accepts: any value starting with a single `/` that is not /login or
 * /register (with or without a query string).
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;

  const pathOnly = raw.split('?')[0];
  if (pathOnly === '/login' || pathOnly === '/register') return fallback;

  return raw;
}
