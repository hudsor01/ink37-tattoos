import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateProductData, UpdateProductData } from '@/lib/security/validation';
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

/**
 * Get all active products for public store catalog. No auth required.
 */
export const getActiveProducts = cache(async () => {
  return db.query.product.findMany({
    where: eq(schema.product.isActive, true),
    orderBy: [asc(schema.product.sortOrder), desc(schema.product.createdAt)],
  });
});

/**
 * Get a single product by ID for product detail page. No auth required.
 */
export const getProductById = cache(async (id: string) => {
  return db.query.product.findFirst({
    where: eq(schema.product.id, id),
  });
});

/**
 * Get all products (including inactive) for admin product list with pagination and search.
 * Requires staff role. Includes order item count via subquery.
 */
export const getProducts = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  name: string;
  description: string | null;
  price: number;
  productType: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  stripePriceId: string | null;
  _count: { orderItems: number };
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`(${schema.product.name} ilike ${'%' + params.search + '%'} or ${schema.product.description} ilike ${'%' + params.search + '%'})`
    );
  }

  const results = await db.select({
    id: schema.product.id,
    name: schema.product.name,
    description: schema.product.description,
    price: schema.product.price,
    productType: schema.product.productType,
    imageUrl: schema.product.imageUrl,
    isActive: schema.product.isActive,
    createdAt: schema.product.createdAt,
    stripePriceId: schema.product.stripePriceId,
    orderItemCount: sql<number>`cast((select count(*) from ${schema.orderItem} where ${schema.orderItem.productId} = ${schema.product.id}) as integer)`,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.product)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(schema.product.sortOrder), desc(schema.product.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const total = results[0]?.total ?? 0;

  return {
    data: results.map(({ total: _, orderItemCount, ...row }) => ({
      ...row,
      _count: { orderItems: orderItemCount },
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
});

/**
 * Create a new product. Requires staff role.
 */
export async function createProduct(data: CreateProductData & { stripeProductId?: string; stripePriceId?: string }) {
  await requireStaffRole();
  const [result] = await db.insert(schema.product).values({
    name: data.name,
    description: data.description,
    price: data.price,
    productType: data.productType,
    imageUrl: data.imageUrl,
    digitalFilePathname: data.digitalFilePathname,
    digitalFileName: data.digitalFileName,
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder ?? 0,
    stripeProductId: data.stripeProductId,
    stripePriceId: data.stripePriceId,
  }).returning();
  if (!result) throw new Error('Failed to create product: no result returned');
  return result;
}

/**
 * Update an existing product. Requires staff role.
 */
export async function updateProduct(data: UpdateProductData & { stripePriceId?: string }) {
  await requireStaffRole();
  const { id, ...updateData } = data;
  const [result] = await db.update(schema.product)
    .set(updateData)
    .where(eq(schema.product.id, id))
    .returning();
  if (!result) throw new Error('Product not found');
  return result;
}

/**
 * Soft-delete a product by setting isActive to false. Requires staff role.
 */
export async function deleteProduct(id: string) {
  await requireStaffRole();
  const [result] = await db.update(schema.product)
    .set({ isActive: false })
    .where(eq(schema.product.id, id))
    .returning();
  if (!result) throw new Error('Product not found');
  return result;
}
