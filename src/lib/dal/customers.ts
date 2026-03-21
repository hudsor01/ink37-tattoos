import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { CreateCustomerData, UpdateCustomerData } from '@/lib/security/validation';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

export const getCustomers = cache(async () => {
  await requireStaffRole();
  return db.customer.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, createdAt: true,
    },
  });
});

export const getCustomerById = cache(async (id: string) => {
  await requireStaffRole();
  return db.customer.findUnique({ where: { id } });
});

export const getCustomerWithDetails = cache(async (id: string) => {
  await requireStaffRole();
  return db.customer.findUnique({
    where: { id },
    include: {
      appointments: true,
      tattooSessions: true,
      designs: true,
    },
  });
});

export async function createCustomer(data: CreateCustomerData) {
  await requireStaffRole();
  return db.customer.create({
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    },
  });
}

export async function updateCustomer(id: string, data: UpdateCustomerData) {
  await requireStaffRole();
  return db.customer.update({
    where: { id },
    data,
  });
}

export async function deleteCustomer(id: string) {
  await requireStaffRole();
  return db.customer.delete({ where: { id } });
}

export const searchCustomers = cache(async (query: string) => {
  await requireStaffRole();
  return db.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, createdAt: true,
    },
  });
});
