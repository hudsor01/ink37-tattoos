import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { randomBytes } from 'node:crypto';
import { DOWNLOAD_LINK_EXPIRY_HOURS, MAX_DOWNLOADS_PER_TOKEN } from '@/lib/store-helpers';
import type { PaginationParams, PaginatedResult } from './types';
import { DEFAULT_PAGE_SIZE } from './types';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!STAFF_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

/**
 * Get orders with pagination and search. Requires staff role.
 */
export const getOrders = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  email: string;
  status: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  createdAt: Date;
  shippingName: string | null;
  items: Array<{ id: string }>;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      sql`(${schema.order.email} ilike ${'%' + params.search + '%'} or ${schema.order.shippingName} ilike ${'%' + params.search + '%'})`
    );
  }

  const results = await db.select({
    id: schema.order.id,
    email: schema.order.email,
    status: schema.order.status,
    subtotal: schema.order.subtotal,
    shippingAmount: schema.order.shippingAmount,
    discountAmount: schema.order.discountAmount,
    total: schema.order.total,
    createdAt: schema.order.createdAt,
    shippingName: schema.order.shippingName,
    itemCount: sql<number>`cast((select count(*) from ${schema.orderItem} where ${schema.orderItem.orderId} = ${schema.order.id}) as integer)`,
    totalCount: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.order)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.order.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const total = results[0]?.totalCount ?? 0;

  return {
    data: results.map(({ totalCount: _tc, itemCount: _ic, ...row }) => ({
      ...row,
      items: Array.from({ length: _ic }, (_v, i) => ({ id: String(i) })),
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
});

/**
 * Get a single order by ID with full details. Requires staff role.
 */
export const getOrderById = cache(async (id: string) => {
  await requireStaffRole();
  return db.query.order.findFirst({
    where: eq(schema.order.id, id),
    with: {
      items: { with: { product: true } },
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
  return db.transaction(async (tx) => {
    // 1. Create the Order
    const [order] = await tx.insert(schema.order).values({
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
    }).returning();

    // 2. Create OrderItems
    const orderItems = await Promise.all(
      data.items.map(async (item) => {
        const [orderItem] = await tx.insert(schema.orderItem).values({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        }).returning();
        return orderItem;
      })
    );

    // 3. For DIGITAL items, create DownloadTokens
    const digitalItems = data.items
      .map((item, index) => ({ ...item, orderItemId: orderItems[index]!.id }))
      .filter((item) => item.productType === 'DIGITAL');

    if (digitalItems.length > 0) {
      await Promise.all(
        digitalItems.map((item) =>
          tx.insert(schema.downloadToken).values({
            token: randomBytes(32).toString('hex'),
            orderId: order.id,
            orderItemId: item.orderItemId,
            maxDownloads: MAX_DOWNLOADS_PER_TOKEN,
            expiresAt: new Date(
              Date.now() + DOWNLOAD_LINK_EXPIRY_HOURS * 60 * 60 * 1000
            ),
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
  const [result] = await db.update(schema.order)
    .set({
      status: data.status as 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED',
      notes: data.notes,
    })
    .where(eq(schema.order.id, data.orderId))
    .returning();
  if (!result) throw new Error('Order not found');
  return result;
}

/**
 * Update order tracking information (carrier and tracking number). Requires staff role.
 */
export async function updateOrderTracking(data: {
  id: string;
  trackingNumber: string;
  trackingCarrier: string;
}) {
  await requireStaffRole();
  const [result] = await db.update(schema.order)
    .set({
      trackingNumber: data.trackingNumber,
      trackingCarrier: data.trackingCarrier,
    })
    .where(eq(schema.order.id, data.id))
    .returning();
  if (!result) {
    throw new Error('Order not found');
  }
  return result;
}

/**
 * Get aggregate order stats. Requires staff role.
 */
export const getOrderStats = cache(async () => {
  await requireStaffRole();

  const [totalRevenueResult, pendingOrdersResult, totalOrdersResult] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${schema.order.total}), 0)` })
      .from(schema.order)
      .where(inArray(schema.order.status, ['PAID', 'SHIPPED', 'DELIVERED'])),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.order)
      .where(eq(schema.order.status, 'PENDING')),
    db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.order),
  ]);

  return {
    totalRevenue: Number(totalRevenueResult[0]?.total ?? 0),
    pendingOrders: pendingOrdersResult[0]?.count ?? 0,
    totalOrders: totalOrdersResult[0]?.count ?? 0,
  };
});

/**
 * Get an order by its Stripe checkout session ID. No auth -- called from webhook.
 */
export async function getOrderByCheckoutSessionId(stripeCheckoutSessionId: string) {
  return db.query.order.findFirst({
    where: eq(schema.order.stripeCheckoutSessionId, stripeCheckoutSessionId),
    with: {
      items: { with: { product: true, downloadTokens: true } },
    },
  });
}
