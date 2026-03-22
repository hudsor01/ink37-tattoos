import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
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
  return db.product.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
});

/**
 * Get a single product by ID for product detail page. No auth required.
 */
export const getProductById = cache(async (id: string) => {
  return db.product.findUnique({ where: { id } });
});

/**
 * Get all products (including inactive) for admin product list. Requires staff role.
 */
export const getProducts = cache(async () => {
  await requireStaffRole();
  return db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { orderItems: true } } },
  });
});

/**
 * Create a new product. Requires staff role.
 */
export async function createProduct(data: CreateProductData & { stripeProductId?: string; stripePriceId?: string }) {
  await requireStaffRole();
  return db.product.create({
    data: {
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
    },
  });
}

/**
 * Update an existing product. Requires staff role.
 */
export async function updateProduct(data: UpdateProductData & { stripePriceId?: string }) {
  await requireStaffRole();
  const { id, ...updateData } = data;
  return db.product.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Soft-delete a product by setting isActive to false. Requires staff role.
 */
export async function deleteProduct(id: string) {
  await requireStaffRole();
  return db.product.update({
    where: { id },
    data: { isActive: false },
  });
}
