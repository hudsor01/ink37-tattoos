import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, desc, ilike, or, count, inArray, lt, sql } from 'drizzle-orm';
import { notification, user, auditLog } from '@/lib/db/schema';
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

// LOW_STOCK notification trigger deferred: product table lacks stock tracking column.
// When inventory management is added, trigger LOW_STOCK notifications from stock update logic.

/**
 * Purge notifications older than configured retention periods.
 *
 * @cron-authorized This function intentionally does NOT call requireStaffRole().
 * It is invoked exclusively from the /api/cron/notifications-cleanup route handler,
 * which performs its own Bearer token authentication via verifyCronAuth().
 * Adding requireStaffRole() here would break the cron job (no user session in cron context).
 */
export async function purgeOldNotifications(
  options: {
    readRetentionDays?: number;
    unreadRetentionDays?: number;
    batchSize?: number;
  } = {}
) {
  const {
    readRetentionDays = 30,
    unreadRetentionDays = 90,
    batchSize = 1000,
  } = options;

  const readCutoff = new Date();
  readCutoff.setDate(readCutoff.getDate() - readRetentionDays);

  const unreadCutoff = new Date();
  unreadCutoff.setDate(unreadCutoff.getDate() - unreadRetentionDays);

  // Delete old READ notifications using raw SQL for batch deletion
  // Drizzle's delete doesn't support LIMIT, so we use a subquery approach
  const deletedReadResult = await db.execute(sql`
    DELETE FROM ${notification}
    WHERE id IN (
      SELECT id FROM ${notification}
      WHERE ${eq(notification.isRead, true)} AND ${lt(notification.createdAt, readCutoff)}
      ORDER BY ${notification.createdAt} ASC
      LIMIT ${batchSize}
    )
  `);

  // Delete old UNREAD notifications using raw SQL for batch deletion
  const deletedUnreadResult = await db.execute(sql`
    DELETE FROM ${notification}
    WHERE id IN (
      SELECT id FROM ${notification}
      WHERE ${eq(notification.isRead, false)} AND ${lt(notification.createdAt, unreadCutoff)}
      ORDER BY ${notification.createdAt} ASC
      LIMIT ${batchSize}
    )
  `);

  const deletedReadCount = deletedReadResult.rowCount ?? 0;
  const deletedUnreadCount = deletedUnreadResult.rowCount ?? 0;
  const totalDeleted = deletedReadCount + deletedUnreadCount;

  // Log audit trail for compliance
  if (totalDeleted > 0) {
    await db.insert(auditLog).values({
      action: 'NOTIFICATION_CLEANUP',
      resource: 'notification',
      ip: 'system',
      userAgent: 'notification-cleanup-cron',
      metadata: {
        deletedReadCount,
        deletedUnreadCount,
        totalDeleted,
        readRetentionDays,
        unreadRetentionDays,
        batchSize,
      },
    });
  }

  return {
    deletedReadCount,
    deletedUnreadCount,
    totalDeleted,
  };
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
