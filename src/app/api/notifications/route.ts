import { getCurrentSession } from '@/lib/auth';
import { getUnreadCount, getRecentNotifications } from '@/lib/dal/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [unreadCount, recent] = await Promise.all([
    getUnreadCount(session.user.id),
    getRecentNotifications(session.user.id, 10),
  ]);

  return NextResponse.json({ unreadCount, recent });
}
