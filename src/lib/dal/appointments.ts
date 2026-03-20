import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
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
