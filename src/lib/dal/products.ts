import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, asc, desc, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { CreateProductData, UpdateProductData } from '@/lib/security/validation';

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
 * Get all products (including inactive) for admin product list. Requires staff role.
 * Includes order item count via extras subquery (replaces Prisma _count).
 */
export const getProducts = cache(async () => {
  await requireStaffRole();
  return db.select({
    id: schema.product.id,
    name: schema.product.name,
    description: schema.product.description,
    price: schema.product.price,
    productType: schema.product.productType,
    imageUrl: schema.product.imageUrl,
    digitalFilePathname: schema.product.digitalFilePathname,
    digitalFileName: schema.product.digitalFileName,
    stripeProductId: schema.product.stripeProductId,
    stripePriceId: schema.product.stripePriceId,
    isActive: schema.product.isActive,
    sortOrder: schema.product.sortOrder,
    createdAt: schema.product.createdAt,
    updatedAt: schema.product.updatedAt,
    _count: {
      orderItems: sql<number>`cast((select count(*) from order_item where order_item."productId" = ${schema.product.id}) as integer)`,
    },
  })
    .from(schema.product)
    .orderBy(asc(schema.product.sortOrder), desc(schema.product.createdAt));
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
  return result;
}
