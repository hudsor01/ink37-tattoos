import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentSession } from '@/lib/auth';
import type { Metadata } from 'next';
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
 */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    const hdrs = await headers();
    const pathname = hdrs.get('x-next-pathname') || '/portal';
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
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
