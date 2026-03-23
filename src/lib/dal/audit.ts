import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

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

export const getAuditLogs = cache(
  async (filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) => {
    await requireStaffRole();

    const conditions = [];
    if (filters?.userId) conditions.push(eq(schema.auditLog.userId, filters.userId));
    if (filters?.resource) conditions.push(eq(schema.auditLog.resource, filters.resource));
    if (filters?.action) conditions.push(eq(schema.auditLog.action, filters.action));

    return db.query.auditLog.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.auditLog.timestamp)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
      with: { user: { columns: { name: true, email: true } } },
    });
  }
);
