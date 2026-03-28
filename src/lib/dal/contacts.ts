import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { and, sql, desc, eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
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

export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const [result] = await db.insert(schema.contact).values(data).returning();
  return result;
}

export const getContacts = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: Date;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`${schema.contact.searchVector} @@ plainto_tsquery('english', ${params.search})`
    );
  }

  const results = await db.select({
    id: schema.contact.id,
    name: schema.contact.name,
    email: schema.contact.email,
    phone: schema.contact.phone,
    message: schema.contact.message,
    status: schema.contact.status,
    createdAt: schema.contact.createdAt,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.contact)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.contact.createdAt))
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

export async function updateContactStatus(id: string, status: 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED') {
  await requireStaffRole();
  const [result] = await db.update(schema.contact)
    .set({ status })
    .where(eq(schema.contact.id, id))
    .returning();
  return result;
}
