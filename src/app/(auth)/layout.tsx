import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Sends an already-authenticated visitor away from /login and /register.
 *
 * This used to live in proxy.ts as "cookie present -> redirect to /dashboard",
 * which was removed because it produced an unbreakable redirect loop: the
 * proxy can only see that a cookie EXISTS (getSessionCookie parses the jar --
 * no HMAC verify, no expiry, no DB lookup), so any stale cookie bounced the
 * user between /login and /dashboard forever with no way to sign in and clear
 * it. See the long comment in src/proxy.ts.
 *
 * Doing it here is safe precisely because this runs a REAL
 * `auth.api.getSession` lookup. A cookie whose session is revoked, expired or
 * secret-rotated yields no session, so the visitor simply gets the login form
 * -- the loop is structurally impossible, because this guard and the
 * (dashboard)/(portal) guards agree on the same validated answer rather than
 * disagreeing about a cookie's existence.
 *
 * Fail-open on error is deliberate: if the session lookup throws, rendering
 * the login form is the safe outcome. Locking people out of the only page
 * that can fix a broken session is not.
 *
 * Without this, /register is reachable while signed in, and
 * `emailAndPassword` does not set `autoSignIn: false` (Better Auth defaults
 * it to true) -- so an admin submitting that form silently creates a second
 * `user`-role account and swaps their own session onto it.
 */
async function RedirectIfAuthenticated() {
  let session: Awaited<ReturnType<typeof getCurrentSession>>;
  try {
    session = await getCurrentSession();
  } catch (error) {
    // redirect()/notFound() and friends travel as thrown signals -- never
    // swallow them (see the AuthGuard pattern note in CLAUDE.md).
    if (isFrameworkSignal(error)) throw error;
    return null;
  }

  if (session?.user) {
    redirect(ADMIN_ROLES.includes(session.user.role) ? '/dashboard' : '/portal');
  }
  return null;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {/* Reading the session makes this dynamic; Cache Components requires
          the boundary. Rendered as a sibling so the form still streams. */}
      <Suspense fallback={null}>
        <RedirectIfAuthenticated />
      </Suspense>
      {children}
    </main>
  );
}
