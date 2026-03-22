'use server';

import { stripe } from '@/lib/stripe';
import { getOrderById, updateOrderStatus } from '@/lib/dal/orders';
import { UpdateOrderStatusSchema } from '@/lib/security/validation';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Update an order's status. Requires staff role (enforced by DAL).
 */
export async function updateOrderStatusAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = UpdateOrderStatusSchema.parse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
    notes: formData.get('notes') || undefined,
  });

  await updateOrderStatus(validated);

  // Audit logging (fire-and-forget)
  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'UPDATE',
    resource: 'order',
    resourceId: validated.orderId,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { status: validated.status, notes: validated.notes },
  }).catch(() => {});

  revalidatePath('/dashboard/orders');

  return { success: true };
}

/**
 * Issue a refund for an order via Stripe and update status.
 */
export async function refundOrderAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const orderId = formData.get('orderId') as string;
  if (!orderId) throw new Error('Order ID is required');

  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found');

  if (!order.stripePaymentIntentId) {
    throw new Error('No Stripe payment intent found for this order');
  }

  // Issue Stripe refund
  await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
  });

  // Update order status to REFUNDED
  await updateOrderStatus({
    orderId,
    status: 'REFUNDED',
    notes: `Refunded by ${session.user.name ?? session.user.email} on ${new Date().toISOString()}`,
  });

  // Audit logging (fire-and-forget)
  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'REFUND',
    resource: 'order',
    resourceId: orderId,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { stripePaymentIntentId: order.stripePaymentIntentId },
  }).catch(() => {});

  revalidatePath('/dashboard/orders');

  return { success: true };
}
