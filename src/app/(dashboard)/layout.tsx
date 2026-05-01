import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireAuthSession } from '@/lib/auth-guard';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AdminNav } from '@/components/dashboard/admin-nav';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { PageTransition } from '@/components/page-transition';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Auth guard wrapped in <Suspense> per Cache Components requirements.
 * Delegates session lookup, framework-signal pass-through, callbackUrl
 * sanitization, and the unauthenticated redirect to requireAuthSession()
 * (src/lib/auth-guard.ts) so the same guarantees apply to every protected
 * segment. This layout adds the admin-role check on top.
 *
 * proxy.ts is the first line of defense for unauthenticated requests;
 * this layout-level check is defense-in-depth and the only enforcement
 * of the admin role requirement.
 */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = await requireAuthSession({
    routeTag: 'dashboard.AuthGuard',
    fallbackPath: '/dashboard',
  });

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
