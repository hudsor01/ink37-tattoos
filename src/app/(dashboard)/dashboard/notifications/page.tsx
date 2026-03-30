import { connection } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getNotifications } from '@/lib/dal/notifications';
import { NotificationsClient } from './notifications-client';

interface NotificationsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  await connection();
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || undefined;

  const result = await getNotifications(session.user.id, {
    page,
    pageSize: 20,
    search,
  });

  // Serialize dates for client component and cast type for NotificationType union
  const serialized = {
    ...result,
    data: result.data.map((n) => ({
      ...n,
      type: n.type as 'BOOKING' | 'PAYMENT' | 'CONTACT' | 'LOW_STOCK',
      createdAt: n.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground">
          View and manage your notification history.
        </p>
      </div>
      <NotificationsClient result={serialized} />
    </div>
  );
}
