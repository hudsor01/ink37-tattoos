import { Suspense } from 'react';
import { redirect, unauthorized } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AdminNav } from '@/components/dashboard/admin-nav';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { PageTransition } from '@/components/page-transition';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Auth guard wrapped in <Suspense> per Cache Components requirements.
 * Reads the session (dynamic via headers/cookies) and either renders the
 * children or short-circuits via unauthorized() / redirect().
 *
 * proxy.ts is the first line of defense for unauthenticated requests; this
 * layout-level check is defense-in-depth and the only enforcement of the
 * admin role requirement.
 */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    unauthorized();
  }
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect('/portal');
  }
  return <>{children}</>;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminNav />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </Suspense>
  );
}
