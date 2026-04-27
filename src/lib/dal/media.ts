import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { PaginationParams, PaginatedResult } from './types';
import { DEFAULT_PAGE_SIZE } from './types';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!STAFF_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

export type MediaApprovalStatus = 'approved' | 'pending' | 'all';

export const getMediaItems = cache(async (
  params: PaginationParams & {
    tag?: string;
    approvalStatus?: MediaApprovalStatus;
  } = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  tags: string[] | null;
  isApproved: boolean;
  isPublic: boolean;
  createdAt: Date;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`(${schema.tattooDesign.name} ilike ${'%' + params.search + '%'} or ${schema.tattooDesign.description} ilike ${'%' + params.search + '%'})`
    );
  }

  // Tag filter using SQL array containment
  if (params.tag) {
    conditions.push(
      sql`${schema.tattooDesign.tags} @> ARRAY[${params.tag}]::text[]`
    );
  }

  // Approval status filter
  if (params.approvalStatus === 'approved') {
    conditions.push(eq(schema.tattooDesign.isApproved, true));
  } else if (params.approvalStatus === 'pending') {
    conditions.push(eq(schema.tattooDesign.isApproved, false));
  }

  const results = await db.select({
    id: schema.tattooDesign.id,
    name: schema.tattooDesign.name,
    fileUrl: schema.tattooDesign.fileUrl,
    thumbnailUrl: schema.tattooDesign.thumbnailUrl,
    designType: schema.tattooDesign.designType,
    tags: schema.tattooDesign.tags,
    isApproved: schema.tattooDesign.isApproved,
    isPublic: schema.tattooDesign.isPublic,
    createdAt: schema.tattooDesign.createdAt,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.tattooDesign)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.tattooDesign.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const total = results[0]?.total ?? 0;

  return {
    data: results.map(({ total: _total, ...row }) => ({ ...row })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
});

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
  if (!result) throw new Error('Failed to create media item: no result returned');
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
  if (!result) throw new Error('Media item not found');
  return result;
}

export async function deleteMediaItem(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.tattooDesign)
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  if (!result) throw new Error('Media item not found');
  return result;
}

export async function togglePublicVisibility(id: string, isPublic: boolean) {
  await requireStaffRole();
  const [result] = await db.update(schema.tattooDesign)
    .set({ isPublic })
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  if (!result) throw new Error('Media item not found');
  return result;
}

export async function bulkUpdateTags(ids: string[], tags: string[]) {
  await requireStaffRole();
  if (ids.length === 0) return [];
  const results = await db.update(schema.tattooDesign)
    .set({ tags })
    .where(inArray(schema.tattooDesign.id, ids))
    .returning();
  return results;
}

export async function toggleMediaApproval(id: string, isApproved: boolean) {
  await requireStaffRole();
  const [result] = await db.update(schema.tattooDesign)
    .set({ isApproved })
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  if (!result) throw new Error('Media item not found');
  return result;
}
