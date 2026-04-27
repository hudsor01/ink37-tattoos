import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { desc, eq, and, sql, ilike, or } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!STAFF_ROLES.includes(session.user.role)) {
    forbidden();
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
  params: { page?: number; pageSize?: number; search?: string; status?: string } = {}
) => {
  await requireStaffRole();

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];

  if (params.search) {
    conditions.push(
      or(
        ilike(schema.contact.name, `%${params.search}%`),
        ilike(schema.contact.email, `%${params.search}%`),
        ilike(schema.contact.message, `%${params.search}%`)
      )!
    );
  }

  if (params.status && params.status !== 'ALL') {
    conditions.push(eq(schema.contact.status, params.status as 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED'));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select()
      .from(schema.contact)
      .where(whereClause)
      .orderBy(desc(schema.contact.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(schema.contact)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
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

export async function updateContact(id: string, data: { status?: 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED'; adminNotes?: string }) {
  await requireStaffRole();
  const [result] = await db.update(schema.contact)
    .set(data)
    .where(eq(schema.contact.id, id))
    .returning();
  if (!result) throw new Error('Contact not found');
  return result;
}

export async function deleteContact(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.contact)
    .where(eq(schema.contact.id, id))
    .returning();
  if (!result) throw new Error('Contact not found');
  return result;
}
