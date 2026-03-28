import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
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

export const getAuditLogs = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  ip: string;
  timestamp: Date;
  metadata: unknown;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`${schema.auditLog.searchVector} @@ plainto_tsquery('english', ${params.search})`
    );
  }

  const results = await db.select({
    id: schema.auditLog.id,
    action: schema.auditLog.action,
    resource: schema.auditLog.resource,
    resourceId: schema.auditLog.resourceId,
    userId: schema.auditLog.userId,
    ip: schema.auditLog.ip,
    timestamp: schema.auditLog.timestamp,
    metadata: schema.auditLog.metadata,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditLog.timestamp))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const total = results[0]?.total ?? 0;

  return {
    data: results.map(({ total: _, ...row }) => row),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
});
