import { connection } from 'next/server';
import { redirect } from 'next/navigation';
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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await connection();

  // Auth guard: require admin or super_admin role
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect('/login');
  }
  if (!ADMIN_ROLES.includes(session.user.role)) {
    redirect('/portal');
  }
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
