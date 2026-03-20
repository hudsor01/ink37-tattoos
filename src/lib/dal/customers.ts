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

export async function createCustomer(data: {
  firstName: string; lastName: string;
  email?: string; phone?: string;
}) {
  await requireStaffRole();
  return db.customer.create({ data });
}
