import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        ip: entry.ip,
        userAgent: entry.userAgent,
        metadata: entry.metadata
          ? (entry.metadata as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
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
    return db.auditLog.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.resource && { resource: filters.resource }),
        ...(filters?.action && { action: filters.action }),
      },
      orderBy: { timestamp: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
      include: { user: { select: { name: true, email: true } } },
    });
  }
);
