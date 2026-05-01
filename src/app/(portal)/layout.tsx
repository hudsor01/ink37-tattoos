import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAuthSession } from '@/lib/auth-guard';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalNav } from '@/components/portal/portal-nav';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'Client Portal | Ink 37 Tattoos',
};

/**
 * Portal auth guard wrapped in <Suspense> per Cache Components
 * requirements. Delegates session lookup + the unauthenticated
 * redirect (with framework-signal pass-through, Sentry-tagged error
 * logging, and safeCallbackUrl on the captured x-pathname) to
 * requireAuthSession() — see src/lib/auth-guard.ts. Portal accepts
 * any authenticated user, so no role check is needed past the
 * session validation done by the helper.
 */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  await requireAuthSession({
    routeTag: 'portal.AuthGuard',
    fallbackPath: '/portal',
  });
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
