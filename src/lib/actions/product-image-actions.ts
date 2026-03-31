'use server';

import { del } from '@vercel/blob';
import {
  createProductImage,
  updateImageVisibility,
  reorderProductImages,
  deleteProductImage,
  syncPrimaryImage,
} from '@/lib/dal/product-images';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const uuidSchema = z.string().uuid();

/**
 * Add a new image to a product gallery.
 * After adding, syncs the product's primary imageUrl.
 */
export async function addProductImageAction(productId: string, url: string, alt?: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  uuidSchema.parse(productId);

  const image = await createProductImage({ productId, url, alt });
  await syncPrimaryImage(productId);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'product_image',
      resourceId: image.id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { productId, url },
    })
  );

  revalidatePath(`/dashboard/products/${productId}/edit`);

  return { success: true, image };
}

/**
 * Toggle visibility of a product image.
 * After toggling, syncs the product's primary imageUrl.
 */
export async function toggleImageVisibilityAction(imageId: string, isVisible: boolean, productId: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  uuidSchema.parse(imageId);
  uuidSchema.parse(productId);

  const image = await updateImageVisibility(imageId, isVisible);
  await syncPrimaryImage(productId);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'product_image',
      resourceId: imageId,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { productId, isVisible },
    })
  );

  revalidatePath(`/dashboard/products/${productId}/edit`);

  return { success: true, image };
}

/**
 * Reorder product images by providing the new ordered list of image IDs.
 * After reordering, syncs the product's primary imageUrl.
 */
export async function reorderProductImagesAction(productId: string, orderedIds: string[]) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  uuidSchema.parse(productId);
  orderedIds.forEach((id) => uuidSchema.parse(id));

  await reorderProductImages(productId, orderedIds);
  await syncPrimaryImage(productId);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'product_image',
      resourceId: productId,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { action: 'reorder', orderedIds },
    })
  );

  revalidatePath(`/dashboard/products/${productId}/edit`);

  return { success: true };
}

/**
 * Delete a product image and its Vercel Blob.
 * After deleting, syncs the product's primary imageUrl.
 */
export async function deleteProductImageAction(imageId: string, productId: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  uuidSchema.parse(imageId);
  uuidSchema.parse(productId);

  const deletedImage = await deleteProductImage(imageId);

  // Clean up the blob from Vercel Blob storage
  if (deletedImage?.url) {
    try {
      await del(deletedImage.url);
    } catch (err) {
      logger.error({ err, imageId }, 'Failed to delete blob for product image');
      // Don't fail the overall action if blob cleanup fails
    }
  }

  await syncPrimaryImage(productId);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'DELETE',
      resource: 'product_image',
      resourceId: imageId,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { productId, url: deletedImage?.url },
    })
  );

  revalidatePath(`/dashboard/products/${productId}/edit`);

  return { success: true };
}
