import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
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
 * Reads the session (dynamic via headers/cookies) and either renders the
 * children or short-circuits via unauthorized() / redirect().
 *
 * proxy.ts is the first line of defense for unauthenticated requests; this
 * layout-level check is defense-in-depth and the only enforcement of the
 * admin role requirement.
 */
async function AuthGuard({ children }: { children: React.ReactNode }) {
  // Wrap session lookup so a transient DB/Better-Auth failure surfaces as
  // a redirect (handled below) rather than a 500. Without this, any throw
  // here bubbles to the Suspense boundary as a render error and the user
  // sees Vercel's generic function-failure page instead of the auth flow.
  // We log the underlying error first so a real outage surfaces in pino
  // (which Sentry ingests) instead of being silently rewritten to "please
  // sign in" -- without that signal, an admin can't tell a flaky DB apart
  // from an unauthenticated visitor.
  let session: Awaited<ReturnType<typeof getCurrentSession>> = null;
  try {
    session = await getCurrentSession();
  } catch (error) {
    logger.error(
      { err: error, route: 'dashboard.AuthGuard' },
      'getCurrentSession threw; redirecting to /login as a safe fallback'
    );
  }

  // Capture the originating path so the user lands back on the page they
  // tried to visit after signing in. proxy.ts forwards x-next-pathname on
  // the request headers; if it's missing (proxy not in the request chain
  // for some reason) we fall back to the dashboard root.
  if (!session?.user) {
    const hdrs = await headers();
    const pathname = hdrs.get('x-next-pathname') || '/dashboard';
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
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
