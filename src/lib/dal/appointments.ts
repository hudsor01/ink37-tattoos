import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
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
  return db.appointment.findMany({
    orderBy: { scheduledDate: 'desc' },
    include: { customer: { select: { firstName: true, lastName: true, email: true } } },
  });
});

export const getAppointmentById = cache(async (id: string) => {
  await requireStaffRole();
  return db.appointment.findUnique({
    where: { id },
    include: { customer: true, artist: true, session: true },
  });
});

export async function createAppointment(data: CreateAppointmentData) {
  await requireStaffRole();
  return db.appointment.create({
    data: {
      ...data,
      scheduledDate: new Date(data.scheduledDate),
    },
  });
}

export async function updateAppointment(id: string, data: UpdateAppointmentData) {
  await requireStaffRole();
  return db.appointment.update({
    where: { id },
    data: {
      ...data,
      ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
    },
  });
}

export async function deleteAppointment(id: string) {
  await requireStaffRole();
  return db.appointment.delete({ where: { id } });
}

export const getAppointmentsByDateRange = cache(
  async (start: Date, end: Date) => {
    await requireStaffRole();
    return db.appointment.findMany({
      where: {
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { scheduledDate: 'asc' },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
  }
);

export const getAppointmentStats = cache(async () => {
  await requireStaffRole();
  return db.appointment.groupBy({
    by: ['status'],
    _count: { status: true },
  });
});
