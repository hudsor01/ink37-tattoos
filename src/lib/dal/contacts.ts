import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
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

export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const [result] = await db.insert(schema.contact).values(data).returning();
  return result;
}

export const getContacts = cache(async () => {
  await requireStaffRole();
  return db.query.contact.findMany({
    orderBy: [desc(schema.contact.createdAt)],
    limit: 100,
  });
});

export async function updateContactStatus(id: string, status: 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED') {
  await requireStaffRole();
  const [result] = await db.update(schema.contact)
    .set({ status })
    .where(eq(schema.contact.id, id))
    .returning();
  return result;
}
