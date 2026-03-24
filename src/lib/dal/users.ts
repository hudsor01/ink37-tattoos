import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const ADMIN_ROLES = ['admin', 'super_admin'];

async function requireAdminRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires admin role');
  }
  return session;
}

export const getUsers = cache(async () => {
  await requireAdminRole();
  return db.query.user.findMany({
    orderBy: [desc(schema.user.createdAt)],
    columns: { id: true, name: true, email: true, role: true, banned: true, createdAt: true },
  });
});
