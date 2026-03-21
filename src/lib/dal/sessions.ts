import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
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
    return db.tattooSession.findMany({
      where: {
        ...(filters?.status && { status: filters.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' }),
      },
      orderBy: { appointmentDate: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        artist: { select: { name: true } },
        appointment: { select: { id: true, type: true, status: true } },
      },
    });
  }
);

export const getSessionById = cache(async (id: string) => {
  await requireStaffRole();
  return db.tattooSession.findUnique({
    where: { id },
    include: {
      customer: true,
      artist: true,
      appointment: true,
    },
  });
});

export async function createSession(data: CreateSessionData) {
  await requireStaffRole();
  return db.tattooSession.create({
    data: {
      ...data,
      appointmentDate: new Date(data.appointmentDate),
    },
  });
}

export async function updateSession(id: string, data: Partial<CreateSessionData>) {
  await requireStaffRole();
  return db.tattooSession.update({
    where: { id },
    data: {
      ...data,
      ...(data.appointmentDate && { appointmentDate: new Date(data.appointmentDate) }),
    },
  });
}

export async function deleteSession(id: string) {
  await requireStaffRole();
  return db.tattooSession.delete({ where: { id } });
}
