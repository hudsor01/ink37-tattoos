import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, asc, and, sql } from 'drizzle-orm';
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

/**
 * Get all images for a product, ordered by sortOrder. Requires staff role.
 */
export const getProductImages = cache(async (productId: string) => {
  await requireStaffRole();
  return db.query.productImage.findMany({
    where: eq(schema.productImage.productId, productId),
    orderBy: [asc(schema.productImage.sortOrder)],
  });
});

/**
 * Create a new product image with the next available sort order. Requires staff role.
 */
export async function createProductImage(data: {
  productId: string;
  url: string;
  alt?: string;
}) {
  await requireStaffRole();

  // Get the current max sortOrder for this product
  const [maxResult] = await db
    .select({ maxSort: sql<number>`coalesce(max(${schema.productImage.sortOrder}), -1)` })
    .from(schema.productImage)
    .where(eq(schema.productImage.productId, data.productId));

  const nextSort = (maxResult?.maxSort ?? -1) + 1;

  const [result] = await db.insert(schema.productImage).values({
    productId: data.productId,
    url: data.url,
    alt: data.alt,
    sortOrder: nextSort,
  }).returning();

  return result;
}

/**
 * Toggle visibility of a product image. Requires staff role.
 */
export async function updateImageVisibility(id: string, isVisible: boolean) {
  await requireStaffRole();
  const [result] = await db.update(schema.productImage)
    .set({ isVisible })
    .where(eq(schema.productImage.id, id))
    .returning();
  return result;
}

/**
 * Reorder product images by setting sortOrder based on array position. Requires staff role.
 */
export async function reorderProductImages(productId: string, orderedIds: string[]) {
  await requireStaffRole();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(schema.productImage)
        .set({ sortOrder: i })
        .where(
          and(
            eq(schema.productImage.id, orderedIds[i]!),
            eq(schema.productImage.productId, productId),
          )
        );
    }
  });
}

/**
 * Delete a product image. Returns the deleted record (including url for blob cleanup). Requires staff role.
 */
export async function deleteProductImage(id: string) {
  await requireStaffRole();
  const [result] = await db.delete(schema.productImage)
    .where(eq(schema.productImage.id, id))
    .returning();
  return result;
}

/**
 * Sync product.imageUrl to the first visible image in the gallery.
 * If no visible images exist, sets imageUrl to null.
 * Uses direct db update to support null values (bypasses Zod schema validation).
 */
export async function syncPrimaryImage(productId: string) {
  const firstVisible = await db.query.productImage.findFirst({
    where: and(
      eq(schema.productImage.productId, productId),
      eq(schema.productImage.isVisible, true),
    ),
    orderBy: [asc(schema.productImage.sortOrder)],
  });

  await db.update(schema.product)
    .set({ imageUrl: firstVisible?.url ?? null })
    .where(eq(schema.product.id, productId));
}
