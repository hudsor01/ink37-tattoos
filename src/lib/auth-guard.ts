import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentSession, type Session } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { safeCallbackUrl } from '@/lib/safe-callback';

/**
 * Returns true for any thrown value that carries Next.js's framework-
 * signal `digest` property. Used by every catch block that wraps a
 * server-component / DAL call to make sure framework control-flow
 * throws (HANGING_PROMISE_REJECTION from Cache Components prerender,
 * NEXT_REDIRECT, NEXT_NOT_FOUND, NEXT_HTTP_ERROR_FALLBACK from
 * unauthorized()/forbidden()) propagate instead of being swallowed.
 *
 * Catching them is how partial prerendering breaks, redirect() turns
 * into a 500, and unauthorized()/forbidden() lose their HTTP semantics.
 *
 * The check is structural rather than nominal because:
 *   - the digest values change between Next minors
 *   - real exceptions could in principle have a `digest` field, but
 *     in practice the framework owns this property name
 *   - importing the private next/dist helpers (isHangingPromiseRejection-
 *     Error, isRedirectError) couples us to module paths that move
 */
export function isFrameworkSignal(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('digest' in error)) return false;
  // Defensive: read the digest inside a try/catch so a pathological
  // error object that defines `digest` as a throwing getter doesn't
  // explode this typeguard. The cost is one extra try/catch per
  // exception path; the win is that the helper is genuinely safe to
  // call from any catch block, including ones wrapping unknown
  // third-party throws.
  try {
    return typeof (error as { digest: unknown }).digest === 'string';
  } catch {
    return false;
  }
}

interface RequireAuthSessionOptions {
  /**
   * Identifies the call site in pino logs (e.g. 'dashboard.AuthGuard').
   * Should be specific enough to grep and to filter Sentry on.
   */
  routeTag: string;

  /**
   * Where to land the user after sign-in if `x-pathname` is missing
   * or `safeCallbackUrl` rejects it. Should be the segment root
   * (e.g. '/dashboard', '/portal').
   */
  fallbackPath: string;
}

/**
 * The shared AuthGuard kernel: looks up the current session, redirects
 * unauthenticated visitors through `/login?callbackUrl=...` with the
 * deep-path preserved, and returns a guaranteed-non-null session for
 * the caller to do further role checks against.
 *
 * Used by:
 *   - src/app/(dashboard)/layout.tsx (then checks ADMIN_ROLES)
 *   - src/app/(portal)/layout.tsx (no further checks)
 *
 * Hardening applied here, not at the call sites, so every protected
 * segment shares the same guarantees:
 *   1. Framework-signal re-throw via isFrameworkSignal — Cache
 *      Components prerender and Next's control-flow throws are NOT
 *      catchable here.
 *   2. `logger.error` with a `handled_via: 'authguard_fallback'` tag
 *      so Sentry can distinguish a real session-lookup outage from
 *      the much more common no-session redirect.
 *   3. `safeCallbackUrl` filters open-redirect / login-loop vectors
 *      on the captured x-pathname header (set by proxy.ts).
 *
 * Returns `NonNullable<Session>` because the no-session branch calls
 * redirect() which is `never`-typed — the type system knows control
 * cannot reach the return statement when session is null.
 */
export async function requireAuthSession({
  routeTag,
  fallbackPath,
}: RequireAuthSessionOptions): Promise<NonNullable<Session>> {
  let session: Session = null;
  try {
    session = await getCurrentSession();
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    logger.error(
      {
        err: error,
        route: routeTag,
        handled_via: 'authguard_fallback',
      },
      'getCurrentSession threw; redirecting to /login as a safe fallback'
    );
  }

  if (!session?.user) {
    const hdrs = await headers();
    const target = safeCallbackUrl(hdrs.get('x-pathname'), fallbackPath);
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }

  return session;
}
