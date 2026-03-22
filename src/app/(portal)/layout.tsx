import type { Metadata } from 'next';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalNav } from '@/components/portal/portal-nav';

export const metadata: Metadata = {
  title: 'Client Portal | Ink 37 Tattoos',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      <PortalNav />
      <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
    </div>
  );
}
