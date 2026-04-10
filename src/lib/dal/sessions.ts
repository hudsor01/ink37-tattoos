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
      sql`(${schema.tattooSession.designDescription} ilike ${'%' + params.search + '%'} or ${schema.tattooSession.placement} ilike ${'%' + params.search + '%'} or ${schema.tattooSession.style} ilike ${'%' + params.search + '%'})`
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
    data: results.map(({ total: _total, ...row }) => ({ ...row })),
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

  // FK validation: verify customerId exists
  const customer = await db.query.customer.findFirst({
    where: eq(schema.customer.id, data.customerId),
    columns: { id: true },
  });
  if (!customer) throw new Error('Customer not found: the specified customer does not exist');

  // FK validation: verify artistId exists
  if (data.artistId) {
    const artist = await db.query.tattooArtist.findFirst({
      where: eq(schema.tattooArtist.id, data.artistId),
      columns: { id: true },
    });
    if (!artist) throw new Error('Artist not found: the specified artist does not exist');
  }

  const [result] = await db.insert(schema.tattooSession).values({
    ...data,
    appointmentDate: new Date(data.appointmentDate),
  }).returning();
  if (!result) throw new Error('Failed to create session: no result returned');
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
  if (!result) throw new Error('Session not found');
  return result;
}

export async function deleteSession(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.tattooSession)
    .where(eq(schema.tattooSession.id, id))
    .returning();
  if (!result) throw new Error('Session not found');
  return result;
}

/**
 * Get sessions with customer data for the payment request dialog.
 * Returns all active sessions (not cancelled) with deposit amounts.
 */
export const getSessionsForPaymentDialog = cache(async () => {
  await requireStaffRole();
  return db.query.tattooSession.findMany({
    where: sql`${schema.tattooSession.status} != 'CANCELLED'`,
    columns: {
      id: true,
      designDescription: true,
      totalCost: true,
      paidAmount: true,
      depositAmount: true,
    },
    with: {
      customer: {
        columns: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: [desc(schema.tattooSession.appointmentDate)],
    limit: 100,
  });
});
