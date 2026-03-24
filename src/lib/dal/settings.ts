import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];
const ADMIN_ROLES = ['admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

async function requireAdminRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!ADMIN_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires admin role');
  }
  return session;
}

export const getSettings = cache(async (category?: string) => {
  await requireStaffRole();
  return db.query.settings.findMany({
    where: category ? eq(schema.settings.category, category) : undefined,
    orderBy: [asc(schema.settings.key)],
  });
});

export const getSettingByKey = cache(async (key: string) => {
  await requireStaffRole();
  return db.query.settings.findFirst({
    where: eq(schema.settings.key, key),
  });
});

export async function upsertSetting(data: {
  key: string;
  value: unknown;
  category: string;
  description?: string;
}) {
  await requireAdminRole();
  const [result] = await db.insert(schema.settings).values({
    key: data.key,
    value: data.value as object,
    category: data.category,
    description: data.description,
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: {
      value: data.value as object,
      category: data.category,
      description: data.description,
    },
  }).returning();
  return result;
}
