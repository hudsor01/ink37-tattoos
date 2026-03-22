import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { DOWNLOAD_LINK_EXPIRY_HOURS, MAX_DOWNLOADS_PER_TOKEN } from '@/lib/store-helpers';

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
 * Get orders with optional filters. Requires staff role.
 */
export const getOrders = cache(
  async (filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    await requireStaffRole();
    return db.order.findMany({
      where: {
        ...(filters?.status && {
          status: filters.status as 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED',
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });
  }
);

/**
 * Get a single order by ID with full details. Requires staff role.
 */
export const getOrderById = cache(async (id: string) => {
  await requireStaffRole();
  return db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      downloadTokens: true,
    },
  });
});

/**
 * Create a new order with items and download tokens for digital products.
 * No auth -- called from webhook handler.
 */
export async function createOrder(data: {
  email: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  giftCardCode?: string;
  items: Array<{
    productId: string;
    productName: string;
    productType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}) {
  return db.$transaction(async (tx) => {
    // 1. Create the Order
    const order = await tx.order.create({
      data: {
        email: data.email,
        subtotal: data.subtotal,
        shippingAmount: data.shippingAmount,
        discountAmount: data.discountAmount,
        total: data.total,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        shippingName: data.shippingName,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingPostalCode: data.shippingPostalCode,
        shippingCountry: data.shippingCountry,
        giftCardCode: data.giftCardCode,
      },
    });

    // 2. Create OrderItems
    const orderItems = await Promise.all(
      data.items.map((item) =>
        tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          },
        })
      )
    );

    // 3. For DIGITAL items, create DownloadTokens
    const digitalItems = data.items
      .map((item, index) => ({ ...item, orderItemId: orderItems[index]!.id }))
      .filter((item) => item.productType === 'DIGITAL');

    if (digitalItems.length > 0) {
      await Promise.all(
        digitalItems.map((item) =>
          tx.downloadToken.create({
            data: {
              token: randomBytes(32).toString('hex'),
              orderId: order.id,
              orderItemId: item.orderItemId,
              maxDownloads: MAX_DOWNLOADS_PER_TOKEN,
              expiresAt: new Date(
                Date.now() + DOWNLOAD_LINK_EXPIRY_HOURS * 60 * 60 * 1000
              ),
            },
          })
        )
      );
    }

    return order;
  });
}

/**
 * Update an order's status. Requires staff role.
 */
export async function updateOrderStatus(data: {
  orderId: string;
  status: string;
  notes?: string;
}) {
  await requireStaffRole();
  return db.order.update({
    where: { id: data.orderId },
    data: {
      status: data.status as 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED',
      notes: data.notes,
    },
  });
}

/**
 * Get aggregate order stats. Requires staff role.
 */
export const getOrderStats = cache(async () => {
  await requireStaffRole();

  const [totalRevenue, pendingOrders, totalOrders] = await Promise.all([
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
    }),
    db.order.count({ where: { status: 'PENDING' } }),
    db.order.count(),
  ]);

  return {
    totalRevenue: Number(totalRevenue._sum.total ?? 0),
    pendingOrders,
    totalOrders,
  };
});

/**
 * Get an order by its Stripe checkout session ID. No auth -- called from webhook.
 */
export async function getOrderByCheckoutSessionId(stripeCheckoutSessionId: string) {
  return db.order.findUnique({
    where: { stripeCheckoutSessionId },
    include: { items: { include: { product: true } } },
  });
}
