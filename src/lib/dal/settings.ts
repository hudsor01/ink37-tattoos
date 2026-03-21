import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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
  return db.settings.findMany({
    where: {
      ...(category && { category }),
    },
    orderBy: { key: 'asc' },
  });
});

export const getSettingByKey = cache(async (key: string) => {
  await requireStaffRole();
  return db.settings.findUnique({ where: { key } });
});

export async function upsertSetting(data: {
  key: string;
  value: unknown;
  category: string;
  description?: string;
}) {
  await requireAdminRole();
  return db.settings.upsert({
    where: { key: data.key },
    create: {
      key: data.key,
      value: data.value as object,
      category: data.category,
      description: data.description,
    },
    update: {
      value: data.value as object,
      category: data.category,
      description: data.description,
    },
  });
}
