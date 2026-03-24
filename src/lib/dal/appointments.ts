import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateAppointmentData, UpdateAppointmentData } from '@/lib/security/validation';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

export const getAppointments = cache(async () => {
  await requireStaffRole();
  return db.query.appointment.findMany({
    orderBy: [desc(schema.appointment.scheduledDate)],
    with: { customer: { columns: { firstName: true, lastName: true, email: true } } },
  });
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
  const [result] = await db.insert(schema.appointment).values({
    ...data,
    scheduledDate: new Date(data.scheduledDate),
  }).returning();
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
  return result;
}

export async function deleteAppointment(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.appointment)
    .where(eq(schema.appointment.id, id))
    .returning();
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
