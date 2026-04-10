import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, gte, lte, desc, asc, sql, not, inArray } from 'drizzle-orm';
import { isWithinInterval, addHours } from 'date-fns';
import * as schema from '@/lib/db/schema';
import type { CreateAppointmentData, UpdateAppointmentData } from '@/lib/security/validation';
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

export const getAppointments = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  scheduledDate: Date;
  duration: number | null;
  status: string;
  type: string;
  customerId: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerEmail: string | null;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    const term = `%${params.search}%`;
    conditions.push(
      sql`(${schema.appointment.firstName} ilike ${term} or ${schema.appointment.lastName} ilike ${term} or ${schema.appointment.email} ilike ${term})`
    );
  }

  const results = await db.select({
    id: schema.appointment.id,
    firstName: schema.appointment.firstName,
    lastName: schema.appointment.lastName,
    email: schema.appointment.email,
    scheduledDate: schema.appointment.scheduledDate,
    duration: schema.appointment.duration,
    status: schema.appointment.status,
    type: schema.appointment.type,
    customerId: schema.appointment.customerId,
    customerFirstName: schema.customer.firstName,
    customerLastName: schema.customer.lastName,
    customerEmail: schema.customer.email,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.appointment)
    .leftJoin(schema.customer, eq(schema.appointment.customerId, schema.customer.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.appointment.scheduledDate))
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

export const getAppointmentById = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.appointment.findFirst({
    where: eq(schema.appointment.id, id),
    with: { customer: true, artist: true, session: true },
  });
});

export async function createAppointment(data: CreateAppointmentData) {
  await requireStaffRole();

  // FK validation: verify customerId exists
  const customer = await db.query.customer.findFirst({
    where: eq(schema.customer.id, data.customerId),
    columns: { id: true },
  });
  if (!customer) throw new Error('Customer not found: the specified customer does not exist');

  const [result] = await db.insert(schema.appointment).values({
    ...data,
    scheduledDate: new Date(data.scheduledDate),
  }).returning();
  if (!result) throw new Error('Failed to create appointment: no result returned');
  return result;
}

export async function updateAppointment(id: string, data: UpdateAppointmentData) {
  await requireStaffRole();
  const setData: Record<string, unknown> = {};
  if (data.status !== undefined) setData.status = data.status;
  if (data.scheduledDate !== undefined) setData.scheduledDate = new Date(data.scheduledDate);
  if (data.duration !== undefined) setData.duration = data.duration;
  if (data.notes !== undefined) setData.notes = data.notes;

  const [result] = await db.update(schema.appointment)
    .set(setData)
    .where(eq(schema.appointment.id, id))
    .returning();
  if (!result) throw new Error('Appointment not found');
  return result;
}

export async function deleteAppointment(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.appointment)
    .where(eq(schema.appointment.id, id))
    .returning();
  if (!result) throw new Error('Appointment not found');
  return result;
}

export const getAppointmentsByDateRange = cache(
  async (start: Date, end: Date) => {
    await requireStaffRole();
    return db.query.appointment.findMany({
      where: and(
        gte(schema.appointment.scheduledDate, start),
        lte(schema.appointment.scheduledDate, end),
      ),
      orderBy: [asc(schema.appointment.scheduledDate)],
      with: { customer: { columns: { firstName: true, lastName: true } } },
    });
  }
);

export const getAppointmentStats = cache(async () => {
  await requireStaffRole();
  return db.select({
    status: schema.appointment.status,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(schema.appointment)
    .groupBy(schema.appointment.status);
});

export async function checkSchedulingConflict(
  proposedDate: Date,
  durationHours: number = 2
): Promise<boolean> {
  await requireStaffRole();
  const proposedEnd = addHours(proposedDate, durationHours);

  const existing = await db.query.appointment.findMany({
    where: and(
      not(inArray(schema.appointment.status, ['CANCELLED', 'NO_SHOW'])),
      gte(schema.appointment.scheduledDate, new Date(proposedDate.getTime() - durationHours * 60 * 60 * 1000)),
      lte(schema.appointment.scheduledDate, proposedEnd),
    ),
    columns: { scheduledDate: true },
  });

  return existing.some((appt) =>
    isWithinInterval(appt.scheduledDate, { start: proposedDate, end: proposedEnd })
  );
}
