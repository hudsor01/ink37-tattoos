'use server';

import { stripe } from '@/lib/stripe';
import { getOrderById, updateOrderStatus, updateOrderTracking } from '@/lib/dal/orders';
import { UpdateOrderStatusSchema } from '@/lib/security/validation';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const VALID_CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'] as const;

const UpdateOrderTrackingSchema = z.object({
  id: z.string().uuid(),
  trackingNumber: z.string().min(1, 'Tracking number is required').max(100),
  trackingCarrier: z.enum(VALID_CARRIERS),
});

/**
 * Update an order's status. Requires staff role (enforced by DAL).
 * When marking as SHIPPED, optionally accepts tracking info.
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

  // If marking as SHIPPED and tracking info is provided, also save tracking
  if (validated.status === 'SHIPPED') {
    const trackingNumber = formData.get('trackingNumber') as string | null;
    const trackingCarrier = formData.get('trackingCarrier') as string | null;
    if (trackingNumber && trackingCarrier) {
      await updateOrderTracking({
        id: validated.orderId,
        trackingNumber,
        trackingCarrier,
      });
    }
  }

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
  revalidatePath(`/dashboard/orders/${validated.orderId}`);

  return { success: true };
}

/**
 * Update order tracking information (carrier and tracking number).
 */
export async function updateOrderTrackingAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = UpdateOrderTrackingSchema.parse({
    id: formData.get('id'),
    trackingNumber: formData.get('trackingNumber'),
    trackingCarrier: formData.get('trackingCarrier'),
  });

  await updateOrderTracking(validated);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'UPDATE',
      resource: 'order',
      resourceId: validated.id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { trackingNumber: validated.trackingNumber, trackingCarrier: validated.trackingCarrier },
    })
  );

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${validated.id}`);

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
  revalidatePath(`/dashboard/orders/${orderId}`);

  return { success: true };
}
