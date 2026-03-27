import { connection } from 'next/server';
import type { Metadata } from 'next';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalNav } from '@/components/portal/portal-nav';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'Client Portal | Ink 37 Tattoos',
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
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
