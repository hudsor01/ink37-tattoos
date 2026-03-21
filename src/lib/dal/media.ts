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

export const getMediaItems = cache(
  async (filters?: { limit?: number; offset?: number }) => {
    await requireStaffRole();
    return db.tattooDesign.findMany({
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
      include: {
        artist: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
  }
);

export const getMediaItemById = cache(async (id: string) => {
  await requireStaffRole();
  return db.tattooDesign.findUnique({
    where: { id },
    include: {
      artist: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
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
  return db.tattooDesign.create({ data });
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
  return db.tattooDesign.update({
    where: { id },
    data,
  });
}

export async function deleteMediaItem(id: string) {
  await requireStaffRole();
  return db.tattooDesign.delete({ where: { id } });
}

export async function togglePublicVisibility(id: string, isPublic: boolean) {
  await requireStaffRole();
  return db.tattooDesign.update({
    where: { id },
    data: { isPublic },
  });
}
