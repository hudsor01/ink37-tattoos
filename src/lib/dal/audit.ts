import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, desc, gte, lte, sql, count } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

const DEFAULT_PAGE_SIZE = 25;

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await db.insert(schema.auditLog).values({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      ip: entry.ip,
      userAgent: entry.userAgent,
      metadata: entry.metadata ?? null,
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  action?: string;
  resource?: string;
  userId?: string;
  search?: string;
  /** Legacy compat */
  limit?: number;
  offset?: number;
}

export const getAuditLogs = cache(async (filters?: AuditLogParams) => {
  await requireStaffRole();

  const conditions = [];
  if (filters?.userId) conditions.push(eq(schema.auditLog.userId, filters.userId));
  if (filters?.resource) conditions.push(eq(schema.auditLog.resource, filters.resource));
  if (filters?.action) conditions.push(eq(schema.auditLog.action, filters.action));
  if (filters?.dateFrom) conditions.push(gte(schema.auditLog.timestamp, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(schema.auditLog.timestamp, filters.dateTo));
  if (filters?.search) {
    conditions.push(
      sql`(${schema.auditLog.action} ILIKE ${'%' + filters.search + '%'} OR ${schema.auditLog.resource} ILIKE ${'%' + filters.search + '%'} OR CAST(${schema.auditLog.metadata} AS TEXT) ILIKE ${'%' + filters.search + '%'})`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Calculate pagination
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? filters?.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters?.offset ?? (page - 1) * pageSize;

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(schema.auditLog)
    .where(whereClause);

  // Get paginated results with user join
  const data = await db.query.auditLog.findMany({
    where: whereClause,
    orderBy: [desc(schema.auditLog.timestamp)],
    limit: pageSize,
    offset,
    with: { user: { columns: { name: true, email: true } } },
  });

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

/**
 * Returns distinct users who have audit log entries, for the user filter dropdown.
 */
export const getAuditLogUsers = cache(async () => {
  await requireStaffRole();

  const results = await db
    .selectDistinctOn([schema.auditLog.userId], {
      userId: schema.auditLog.userId,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.auditLog)
    .innerJoin(schema.user, eq(schema.auditLog.userId, schema.user.id))
    .orderBy(schema.auditLog.userId);

  return results;
});
