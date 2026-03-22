'use server';

import { stripe, dollarsToStripeCents } from '@/lib/stripe';
import { createProduct, updateProduct, deleteProduct, getProductById } from '@/lib/dal/products';
import { CreateProductSchema, UpdateProductSchema } from '@/lib/security/validation';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Create a new product with Stripe sync (D-01).
 * Creates Stripe Product + Price, then stores IDs in local DB.
 */
export async function createProductAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = CreateProductSchema.parse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    price: Number(formData.get('price')),
    productType: formData.get('productType'),
    imageUrl: formData.get('imageUrl') || undefined,
    digitalFilePathname: formData.get('digitalFilePathname') || undefined,
    digitalFileName: formData.get('digitalFileName') || undefined,
    isActive: formData.get('isActive') !== 'false',
    sortOrder: Number(formData.get('sortOrder') || 0),
  });

  // Create Stripe Product and Price
  const stripeProduct = await stripe.products.create({
    name: validated.name,
    description: validated.description ?? undefined,
    images: validated.imageUrl ? [validated.imageUrl] : undefined,
  });

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: dollarsToStripeCents(validated.price),
    currency: 'usd',
  });

  // Create local product with Stripe IDs
  const product = await createProduct({
    ...validated,
    stripeProductId: stripeProduct.id,
    stripePriceId: stripePrice.id,
  });

  // Audit logging (fire-and-forget)
  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'CREATE',
    resource: 'product',
    resourceId: product.id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { name: validated.name, price: validated.price, productType: validated.productType },
  }).catch(() => {});

  revalidatePath('/dashboard/products');

  return { success: true, product };
}

/**
 * Update an existing product with Stripe sync.
 * If price changed, creates new Stripe Price and archives old one.
 */
export async function updateProductAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = UpdateProductSchema.parse({
    id: formData.get('id'),
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    price: formData.get('price') ? Number(formData.get('price')) : undefined,
    productType: formData.get('productType') || undefined,
    imageUrl: formData.get('imageUrl') || undefined,
    digitalFilePathname: formData.get('digitalFilePathname') || undefined,
    digitalFileName: formData.get('digitalFileName') || undefined,
    isActive: formData.has('isActive') ? formData.get('isActive') !== 'false' : undefined,
    sortOrder: formData.has('sortOrder') ? Number(formData.get('sortOrder')) : undefined,
  });

  const existing = await getProductById(validated.id);
  if (!existing) throw new Error('Product not found');

  let newStripePriceId: string | undefined;

  // If price changed, create new Stripe Price and archive old one
  if (validated.price !== undefined && validated.price !== Number(existing.price)) {
    if (existing.stripeProductId) {
      const newPrice = await stripe.prices.create({
        product: existing.stripeProductId,
        unit_amount: dollarsToStripeCents(validated.price),
        currency: 'usd',
      });
      newStripePriceId = newPrice.id;

      // Archive old price
      if (existing.stripePriceId) {
        await stripe.prices.update(existing.stripePriceId, { active: false });
      }
    }
  }

  // Update Stripe Product metadata if name/description changed
  if (existing.stripeProductId && (validated.name || validated.description !== undefined)) {
    await stripe.products.update(existing.stripeProductId, {
      ...(validated.name && { name: validated.name }),
      ...(validated.description !== undefined && { description: validated.description }),
    });
  }

  const product = await updateProduct({
    ...validated,
    ...(newStripePriceId && { stripePriceId: newStripePriceId }),
  });

  // Audit logging (fire-and-forget)
  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'UPDATE',
    resource: 'product',
    resourceId: validated.id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { changes: validated },
  }).catch(() => {});

  revalidatePath('/dashboard/products');

  return { success: true, product };
}

/**
 * Soft-delete a product and archive it in Stripe.
 */
export async function deleteProductAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const productId = formData.get('productId') as string;
  if (!productId) throw new Error('Product ID is required');

  const existing = await getProductById(productId);
  if (!existing) throw new Error('Product not found');

  // Soft-delete locally
  await deleteProduct(productId);

  // Archive in Stripe
  if (existing.stripeProductId) {
    await stripe.products.update(existing.stripeProductId, { active: false });
  }

  // Audit logging (fire-and-forget)
  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'DELETE',
    resource: 'product',
    resourceId: productId,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { name: existing.name },
  }).catch(() => {});

  revalidatePath('/dashboard/products');

  return { success: true };
}
