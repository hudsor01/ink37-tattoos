// TODO: Notification retention policy -- currently notifications are never deleted.
// Future enhancement: add a scheduled job or DAL function to purge notifications
// older than N days (e.g., 90 days) to prevent unbounded table growth.

import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, desc, ilike, or, count, inArray } from 'drizzle-orm';
import { notification, user } from '@/lib/db/schema';
import type { PaginationParams, PaginatedResult } from './types';
import { DEFAULT_PAGE_SIZE } from './types';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  await requireStaffRole();
  const [result] = await db.select({ count: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
  return result?.count ?? 0;
});

export const getRecentNotifications = cache(async (userId: string, limit = 10) => {
  await requireStaffRole();
  return db.select()
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
});

export const getNotifications = cache(async (
  userId: string,
  params: PaginationParams,
): Promise<PaginatedResult<typeof notification.$inferSelect>> => {
  await requireStaffRole();

  const { page = 1, pageSize = DEFAULT_PAGE_SIZE, search } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(notification.userId, userId)];
  if (search) {
    conditions.push(
      or(
        ilike(notification.title, `%${search}%`),
        ilike(notification.message, `%${search}%`),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [data, [totalResult]] = await Promise.all([
    db.select()
      .from(notification)
      .where(whereClause)
      .orderBy(desc(notification.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() })
      .from(notification)
      .where(whereClause),
  ]);

  const total = totalResult?.count ?? 0;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

export async function markAsRead(notificationId: string, userId: string) {
  await requireStaffRole();
  const [result] = await db.update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
    .returning();
  return result;
}

export async function markAllAsRead(userId: string) {
  await requireStaffRole();
  await db.update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
}

export async function createNotificationForAdmins(data: {
  type: 'BOOKING' | 'PAYMENT' | 'CONTACT' | 'LOW_STOCK';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  // Find all admin and super_admin users
  const adminUsers = await db.select({ id: user.id })
    .from(user)
    .where(inArray(user.role, ['admin', 'super_admin']));

  if (adminUsers.length === 0) return;

  // Batch insert one notification per admin user
  await db.insert(notification).values(
    adminUsers.map((adminUser) => ({
      userId: adminUser.id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata ?? null,
    })),
  );
}
