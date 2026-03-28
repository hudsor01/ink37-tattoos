import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateSessionData } from '@/lib/security/validation';
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

export const getSessions = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  designDescription: string;
  placement: string;
  style: string;
  status: string;
  appointmentDate: Date;
  totalCost: number;
  paidAmount: number;
  notes: string | null;
  customerId: string;
  artistId: string;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`${schema.tattooSession.searchVector} @@ plainto_tsquery('english', ${params.search})`
    );
  }

  const results = await db.select({
    id: schema.tattooSession.id,
    designDescription: schema.tattooSession.designDescription,
    placement: schema.tattooSession.placement,
    style: schema.tattooSession.style,
    status: schema.tattooSession.status,
    appointmentDate: schema.tattooSession.appointmentDate,
    totalCost: schema.tattooSession.totalCost,
    paidAmount: schema.tattooSession.paidAmount,
    notes: schema.tattooSession.notes,
    customerId: schema.tattooSession.customerId,
    artistId: schema.tattooSession.artistId,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.tattooSession)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.tattooSession.appointmentDate))
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
