import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentSession, type Session } from '@/lib/auth';
import type { Metadata } from 'next';
import { logger } from '@/lib/logger';
import { safeCallbackUrl } from '@/lib/safe-callback';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalNav } from '@/components/portal/portal-nav';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'Client Portal | Ink 37 Tattoos',
};

/**
 * Portal auth guard wrapped in <Suspense> per Cache Components requirements.
 * Reads session + headers (both dynamic) to either render the children or
 * redirect unauthenticated users to /login with the original path captured
 * as a callback. Portal requires any authenticated user (USER+ role).
 *
 * Mirrors the (dashboard) AuthGuard hardening: a try/catch surfaces a
 * transient session-lookup failure to pino → Sentry instead of bubbling
 * to the Suspense boundary as a 500, and safeCallbackUrl filters open-
 * redirect / login-loop edge cases on the captured pathname.
 */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  let session: Session = null;
  try {
    session = await getCurrentSession();
  } catch (error) {
    // Re-throw Next.js framework signals (HANGING_PROMISE_REJECTION
    // from prerender, NEXT_REDIRECT, NEXT_NOT_FOUND, NEXT_HTTP_ERROR_
    // FALLBACK). Catching them here would break Cache Components
    // prerender and any framework control-flow throws emitted from
    // inside the auth call chain. The `digest` property is the
    // convention -- see (dashboard)/layout.tsx for the same guard.
    if (typeof error === 'object' && error !== null && 'digest' in error) {
      throw error;
    }
    logger.error(
      {
        err: error,
        route: 'portal.AuthGuard',
        handled_via: 'authguard_fallback',
      },
      'getCurrentSession threw; redirecting to /login as a safe fallback'
    );
  }

  if (!session?.user) {
    const hdrs = await headers();
    const target = safeCallbackUrl(hdrs.get('x-pathname'), '/portal');
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
  }
  return <>{children}</>;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      <PortalNav />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <Suspense fallback={null}>
          <AuthGuard>
            <PageTransition>{children}</PageTransition>
          </AuthGuard>
        </Suspense>
      </main>
    </div>
  );
}
