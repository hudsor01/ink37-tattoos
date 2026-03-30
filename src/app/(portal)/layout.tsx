import { connection } from 'next/server';
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

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    // Redirect unauthenticated users to login with callback URL
    const hdrs = await headers();
    const pathname = hdrs.get('x-next-pathname') || '/portal';
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }
  // Portal requires any authenticated user (USER+ role) -- no additional role check needed

  await connection();
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      <PortalNav />
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
