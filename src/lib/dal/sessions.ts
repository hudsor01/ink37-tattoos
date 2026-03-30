import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateSessionData } from '@/lib/security/validation';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

export const getSessions = cache(
  async (filters?: { status?: string; limit?: number; offset?: number }) => {
    await requireStaffRole();

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(schema.tattooSession.status, filters.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'));
    }

    return db.query.tattooSession.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.tattooSession.appointmentDate)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
      with: {
        customer: { columns: { firstName: true, lastName: true, email: true } },
        artist: { columns: { name: true } },
        appointment: { columns: { id: true, type: true, status: true } },
      },
    });
  }
);

export const getSessionById = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.tattooSession.findFirst({
    where: eq(schema.tattooSession.id, id),
    with: {
      customer: true,
      artist: true,
      appointment: true,
    },
  });
});

/**
 * Get session with full details including payments.
 * Uses variable name tattooSessionData to avoid collision with auth session (Research pitfall 6).
 */
export const getSessionWithDetails = cache(async (id: string) => {
  await requireStaffRole();
  const tattooSessionData = await db.query.tattooSession.findFirst({
    where: eq(schema.tattooSession.id, id),
    with: {
      customer: true,
      artist: true,
      appointment: true,
      payments: {
        with: {
          customer: true,
        },
      },
    },
  });
  return tattooSessionData;
});

export async function createSession(data: CreateSessionData) {
  await requireStaffRole();
  const [result] = await db.insert(schema.tattooSession).values({
    ...data,
    appointmentDate: new Date(data.appointmentDate),
  }).returning();
  return result;
}

export async function updateSession(id: string, data: Partial<CreateSessionData>) {
  await requireStaffRole();
  const setData: Record<string, unknown> = { ...data };
  if (data.appointmentDate !== undefined) {
    setData.appointmentDate = new Date(data.appointmentDate);
  }
  const [result] = await db.update(schema.tattooSession)
    .set(setData)
    .where(eq(schema.tattooSession.id, id))
    .returning();
  return result;
}

export async function deleteSession(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.tattooSession)
    .where(eq(schema.tattooSession.id, id))
    .returning();
  return result;
}
