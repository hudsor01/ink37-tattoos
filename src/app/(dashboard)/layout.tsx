import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentSession } from '@/lib/auth';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AdminNav } from '@/components/dashboard/admin-nav';
import { Separator } from '@/components/ui/separator';
import { DynamicBreadcrumbs } from '@/components/dashboard/dynamic-breadcrumbs';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { PageTransition } from '@/components/page-transition';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    // Redirect unauthenticated users to login with callback URL
    const hdrs = await headers();
    const pathname = hdrs.get('x-next-pathname') || '/dashboard';
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  // Dashboard requires ADMIN+ role
  const ADMIN_ROLES = ['admin', 'super_admin'];
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect('/access-denied');
  }

  await connection();
  return (
    <SidebarProvider>
      <AdminNav />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="h-4" />
          <DynamicBreadcrumbs />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="p-4 md:p-6" aria-label="Main content">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
