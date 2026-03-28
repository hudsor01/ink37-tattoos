'use server';

import { stripe } from '@/lib/stripe';
import { getOrderById, updateOrderStatus } from '@/lib/dal/orders';
import { UpdateOrderStatusSchema } from '@/lib/security/validation';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Update an order's status. Requires staff role (enforced by DAL).
 */
export async function updateOrderStatusAction(formData: FormData) {
  const session = await requireRole('admin');

  const validated = UpdateOrderStatusSchema.parse({
    orderId: formData.get('orderId'),
    status: formData.get('status'),
    notes: formData.get('notes') || undefined,
  });

  await updateOrderStatus(validated);

  // Audit logging (runs after response)
  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'order',
      resourceId: validated.orderId,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { status: validated.status, notes: validated.notes },
    })
  );

  revalidatePath('/dashboard/orders');

  return { success: true };
}

/**
 * Issue a refund for an order via Stripe and update status.
 */
export async function refundOrderAction(formData: FormData) {
  const session = await requireRole('admin');

  const orderId = formData.get('orderId') as string;
  if (!orderId) throw new Error('Order ID is required');

  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found');

  if (!order.stripePaymentIntentId) {
    throw new Error('No Stripe payment intent found for this order');
  }

  // Issue Stripe refund and update order status in parallel
  await Promise.all([
    stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
    }),
    updateOrderStatus({
      orderId,
      status: 'REFUNDED',
      notes: `Refunded by ${session.user.name ?? session.user.email} on ${new Date().toISOString()}`,
    }),
  ]);

  // Audit logging (runs after response)
  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'REFUND',
      resource: 'order',
      resourceId: orderId,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { stripePaymentIntentId: order.stripePaymentIntentId },
    })
  );

  revalidatePath('/dashboard/orders');

  return { success: true };
}
