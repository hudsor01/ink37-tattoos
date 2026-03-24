import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
  }
  return session;
}

export const getMediaItems = cache(
  async (filters?: { limit?: number; offset?: number }) => {
    await requireStaffRole();
    return db.query.tattooDesign.findMany({
      orderBy: [desc(schema.tattooDesign.createdAt)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
      with: {
        artist: { columns: { name: true } },
        customer: { columns: { firstName: true, lastName: true } },
      },
    });
  }
);

export const getMediaItemById = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.tattooDesign.findFirst({
    where: eq(schema.tattooDesign.id, id),
    with: {
      artist: { columns: { name: true } },
      customer: { columns: { firstName: true, lastName: true } },
    },
  });
});

export async function createMediaItem(data: {
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  designType?: string;
  size?: string;
  style?: string;
  tags?: string[];
  artistId: string;
  customerId?: string;
  description?: string;
}) {
  await requireStaffRole();
  const [result] = await db.insert(schema.tattooDesign).values(data).returning();
  return result;
}

export async function updateMediaItem(
  id: string,
  data: {
    name?: string;
    description?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    designType?: string;
    size?: string;
    style?: string;
    tags?: string[];
    isApproved?: boolean;
    isPublic?: boolean;
  }
) {
  await requireStaffRole();
  const [result] = await db.update(schema.tattooDesign)
    .set(data)
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  return result;
}

export async function deleteMediaItem(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.tattooDesign)
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  return result;
}

export async function togglePublicVisibility(id: string, isPublic: boolean) {
  await requireStaffRole();
  const [result] = await db.update(schema.tattooDesign)
    .set({ isPublic })
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  return result;
}
