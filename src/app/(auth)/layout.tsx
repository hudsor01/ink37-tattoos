import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';
import { AUTH_PATHS, safeCallbackUrl } from '@/lib/safe-callback';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Sends an already-authenticated visitor away from /login and /register.
 *
 * This used to live in proxy.ts as "cookie present -> redirect to /dashboard",
 * which was removed because it produced an unbreakable redirect loop: the
 * proxy can only see that a cookie EXISTS (it parses the jar -- no HMAC
 * verify, no expiry, no DB lookup), so any stale cookie bounced the user
 * between /login and /dashboard forever with no way to sign in and clear it.
 * See the long comment in src/proxy.ts.
 *
 * Doing it here is safe because this runs a REAL `auth.api.getSession`
 * lookup: a revoked, expired or secret-rotated cookie yields no session, so
 * the visitor just gets the login form.
 *
 * GATED TO AUTH_PATHS, not the whole route group. `(auth)` also contains
 * /forgot-password and /reset-password, and a user following an emailed reset
 * link usually still HAS a live session (they last 7 days). Redirecting those
 * would bounce them to /dashboard before reset-password/page.tsx can read its
 * `token` query param -- the single-use token is never consumed, it expires,
 * and that browser can never change its password again. Sharing AUTH_PATHS
 * with safe-callback keeps the two modules from disagreeing about what counts
 * as an auth page.
 *
 * KNOWN LIMIT -- this is a UX redirect, not an enforcement boundary. Under
 * `cacheComponents: true` a `redirect()` thrown inside a Suspense boundary
 * after the shell has flushed cannot emit a 3xx; Next falls back to
 * `<meta http-equiv="refresh" content="1;url=...">`, so a signed-in visitor
 * briefly sees the rendered form. Anything that must be enforced belongs
 * server-side -- notably `emailAndPassword.autoSignIn`, which Better Auth
 * defaults to true, so submitting /register while signed in swaps the
 * session onto a fresh `user`-role account. Set `autoSignIn: false` in
 * src/lib/auth.ts to close that properly.
 */
async function RedirectIfAuthenticated() {
  // proxy.ts forwards path+search on x-pathname.
  const hdrs = await headers();
  const pathname = (hdrs.get('x-pathname') ?? '').split('?')[0];
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (!AUTH_PATHS.includes(normalized)) return null;

  let session: Awaited<ReturnType<typeof getCurrentSession>>;
  try {
    session = await getCurrentSession();
  } catch (error) {
    // redirect()/notFound() travel as thrown signals -- never swallow them.
    if (isFrameworkSignal(error)) throw error;
    // Telemetry parity with requireAuthSession's authguard_fallback branch.
    // Without it, a flapping session lookup shows up only as "signed-in users
    // keep landing on the login form" with nothing tying it to the DB, while
    // the (dashboard)/(portal) half of the same outage is fully instrumented.
    logger.error(
      { err: error, route: 'auth.RedirectIfAuthenticated', handled_via: 'authguard_fallback' },
      'getCurrentSession threw; rendering the auth form as a safe fallback'
    );
    // Fail OPEN here on purpose: this guard's job is convenience, and locking
    // people out of the only page that can repair a broken session is worse
    // than showing it to someone already signed in.
    return null;
  }

  if (session?.user) {
    const fallback = ADMIN_ROLES.includes(session.user.role)
      ? '/dashboard'
      : '/portal';
    // Honor an explicit callbackUrl so a deep link survives; safeCallbackUrl
    // rejects anything off-origin and refuses to point back at an auth page.
    // URLSearchParams (not a manual split) so the value is properly decoded
    // and other query params cannot bleed into it.
    const search = hdrs.get('x-pathname')?.split('?')[1] ?? '';
    const requested = new URLSearchParams(search).get('callbackUrl');
    redirect(safeCallbackUrl(requested, fallback));
  }
  return null;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {/* Reading headers + session makes this dynamic; Cache Components
          requires the boundary. Rendered as a sibling so the form still
          streams rather than waiting on the lookup. */}
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>
      {children}
    </main>
  );
}
