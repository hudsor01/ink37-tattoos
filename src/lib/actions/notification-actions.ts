'use server';

import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { markAsRead, markAllAsRead } from '@/lib/dal/notifications';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export async function markNotificationReadAction(notificationId: string) {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  try {
    const result = await markAsRead(notificationId, session.user.id);
    revalidatePath('/dashboard/notifications');
    return { success: true as const, data: result };
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark notification as read');
    return { success: false as const, error: 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsReadAction() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  try {
    await markAllAsRead(session.user.id);
    revalidatePath('/dashboard/notifications');
    return { success: true as const };
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark all notifications as read');
    return { success: false as const, error: 'Failed to mark all notifications as read' };
  }
}
