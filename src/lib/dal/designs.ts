import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc, ilike, or, arrayContains } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
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

// PUBLIC -- no auth required (gallery content is public per locked decision)
export const getPublicDesigns = cache(async (filters?: { style?: string; tags?: string[] }) => {
  const conditions = [
    eq(schema.tattooDesign.isApproved, true),
    eq(schema.tattooDesign.isPublic, true),
  ];
  if (filters?.style) {
    conditions.push(eq(schema.tattooDesign.designType, filters.style));
  }
  if (filters?.tags && filters.tags.length > 0) {
    conditions.push(arrayContains(schema.tattooDesign.tags, filters.tags));
  }

  return db.query.tattooDesign.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.tattooDesign.createdAt)],
  });
});

// PUBLIC -- single design detail
export const getPublicDesignById = cache(async (id: string) => {
  return db.query.tattooDesign.findFirst({
    where: and(
      eq(schema.tattooDesign.id, id),
      eq(schema.tattooDesign.isApproved, true),
      eq(schema.tattooDesign.isPublic, true),
    ),
    with: { artist: { columns: { name: true } } },
  });
});

// ADMIN -- all designs including unapproved, with pagination and search
export const getAllDesigns = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  name: string;
  description: string | null;
  designType: string | null;
  style: string | null;
  isApproved: boolean;
  isPublic: boolean;
  createdAt: Date;
  tags: string[] | null;
}>> => {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`(${schema.tattooDesign.name} ilike ${'%' + params.search + '%'} or ${schema.tattooDesign.description} ilike ${'%' + params.search + '%'})`
    );
  }

  const results = await db.select({
    id: schema.tattooDesign.id,
    name: schema.tattooDesign.name,
    description: schema.tattooDesign.description,
    designType: schema.tattooDesign.designType,
    style: schema.tattooDesign.style,
    isApproved: schema.tattooDesign.isApproved,
    isPublic: schema.tattooDesign.isPublic,
    createdAt: schema.tattooDesign.createdAt,
    tags: schema.tattooDesign.tags,
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

/**
 * Get designs filtered by approval status for the design approval page.
 * Includes fileUrl, thumbnailUrl, and rejectionNotes needed for the thumbnail grid.
 */
export const getDesignsByApprovalStatus = cache(async (
  status: 'pending' | 'approved' | 'all',
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  style: string | null;
  tags: string[] | null;
  isApproved: boolean;
  isPublic: boolean;
  rejectionNotes: string | null;
  createdAt: Date;
}>> => {
  await requireStaffRole();

  const conditions = [];

  // Filter by approval status
  if (status === 'pending') {
    conditions.push(eq(schema.tattooDesign.isApproved, false));
  } else if (status === 'approved') {
    conditions.push(eq(schema.tattooDesign.isApproved, true));
  }
  // 'all' has no approval filter

  // Search support via ilike on name/style
  if (params.search) {
    conditions.push(
      or(
        ilike(schema.tattooDesign.name, `%${params.search}%`),
        ilike(schema.tattooDesign.style, `%${params.search}%`),
      )!,
    );
  }

  const results = await db.select({
    id: schema.tattooDesign.id,
    name: schema.tattooDesign.name,
    description: schema.tattooDesign.description,
    fileUrl: schema.tattooDesign.fileUrl,
    thumbnailUrl: schema.tattooDesign.thumbnailUrl,
    designType: schema.tattooDesign.designType,
    style: schema.tattooDesign.style,
    tags: schema.tattooDesign.tags,
    isApproved: schema.tattooDesign.isApproved,
    isPublic: schema.tattooDesign.isPublic,
    rejectionNotes: schema.tattooDesign.rejectionNotes,
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

/**
 * Update a design's approval status. Requires staff role.
 * When approving, clears rejectionNotes. When rejecting, stores rejectionNotes.
 */
export async function updateDesignApprovalStatus(
  id: string,
  isApproved: boolean,
  rejectionNotes?: string | null
) {
  await requireStaffRole();

  const updateData: Record<string, unknown> = { isApproved };
  if (isApproved) {
    // Clear rejection notes on approval
    updateData.rejectionNotes = null;
  } else if (rejectionNotes !== undefined) {
    // Store rejection notes when rejecting
    updateData.rejectionNotes = rejectionNotes;
  }

  const [result] = await db.update(schema.tattooDesign)
    .set(updateData)
    .where(eq(schema.tattooDesign.id, id))
    .returning();
  if (!result) throw new Error('Design not found');
  return result;
}
