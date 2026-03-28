import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateCustomerData, UpdateCustomerData } from '@/lib/security/validation';
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

export const getCustomers = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`${schema.customer.searchVector} @@ plainto_tsquery('english', ${params.search})`
    );
  }

  const results = await db.select({
    id: schema.customer.id,
    firstName: schema.customer.firstName,
    lastName: schema.customer.lastName,
    email: schema.customer.email,
    phone: schema.customer.phone,
    createdAt: schema.customer.createdAt,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.customer)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.customer.createdAt))
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
