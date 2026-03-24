import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, or, ilike, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
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
  return db.query.customer.findMany({
    orderBy: [desc(schema.customer.createdAt)],
    columns: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, createdAt: true,
    },
  });
});

export const getCustomerById = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.customer.findFirst({
    where: eq(schema.customer.id, id),
  });
});

export const getCustomerWithDetails = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.customer.findFirst({
    where: eq(schema.customer.id, id),
    with: {
      appointments: true,
      tattooSessions: true,
      designs: true,
    },
  });
});

export async function createCustomer(data: CreateCustomerData) {
  await requireStaffRole();
  const [result] = await db.insert(schema.customer).values({
    ...data,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
  }).returning();
  return result;
}

export async function updateCustomer(id: string, data: UpdateCustomerData) {
  await requireStaffRole();
  const setData: Record<string, unknown> = { ...data };
  if (data.dateOfBirth !== undefined) {
    setData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  }
  const [result] = await db.update(schema.customer)
    .set(setData)
    .where(eq(schema.customer.id, id))
    .returning();
  return result;
}

export async function deleteCustomer(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.customer)
    .where(eq(schema.customer.id, id))
    .returning();
  return result;
}

export const searchCustomers = cache(async (query: string) => {
  await requireStaffRole();
  return db.query.customer.findMany({
    where: or(
      ilike(schema.customer.firstName, `%${query}%`),
      ilike(schema.customer.lastName, `%${query}%`),
      ilike(schema.customer.email, `%${query}%`),
    ),
    orderBy: [desc(schema.customer.createdAt)],
    columns: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, createdAt: true,
    },
  });
});
