import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentSession, type Session } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { safeCallbackUrl } from '@/lib/safe-callback';
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
 * children or redirects unauthenticated visitors to the auth flow with a
 * preserved deep-path callbackUrl.
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
  //
  // We log the underlying error before swallowing so a real outage shows
  // up in pino → Sentry instead of being silently rewritten to "please
  // sign in" -- without that signal, an admin can't tell a flaky DB apart
  // from an unauthenticated visitor. The `handled_via` tag lets a Sentry
  // dashboard distinguish AuthGuard fallbacks from genuine no-session
  // redirects (the latter never go through this catch arm).
  let session: Session = null;
  try {
    session = await getCurrentSession();
  } catch (error) {
    // Re-throw Next.js framework signals (HANGING_PROMISE_REJECTION
    // from prerender, NEXT_REDIRECT from redirect(), NEXT_NOT_FOUND
    // from notFound(), NEXT_HTTP_ERROR_FALLBACK from unauthorized()).
    // Catching them here would break Cache Components prerender and
    // any framework control-flow throws emitted from inside the auth
    // call chain. The `digest` property is the convention.
    if (typeof error === 'object' && error !== null && 'digest' in error) {
      throw error;
    }
    logger.error(
      {
        err: error,
        route: 'dashboard.AuthGuard',
        handled_via: 'authguard_fallback',
      },
      'getCurrentSession threw; redirecting to /login as a safe fallback'
    );
  }

  // Capture the originating path+search so the user lands back on the
  // exact page they tried to visit after signing in. proxy.ts forwards
  // x-pathname on the request headers; safeCallbackUrl rejects unsafe
  // values (protocol-relative URLs, /login itself, etc.) and falls back
  // to /dashboard if the header is missing or unsafe.
  if (!session?.user) {
    const hdrs = await headers();
    const target = safeCallbackUrl(hdrs.get('x-pathname'), '/dashboard');
    redirect(`/login?callbackUrl=${encodeURIComponent(target)}`);
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
