import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import type { PaginationParams, PaginatedResult } from './types';
import { DEFAULT_PAGE_SIZE } from './types';

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
 * Get or create a Stripe customer for a given internal customer (D-03).
 * Checks stripeCustomerId first; creates in Stripe if null, then persists.
 */
export async function getOrCreateStripeCustomer(customer: {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (customer.stripeCustomerId) {
    return customer.stripeCustomerId;
  }

  const stripeCustomer = await stripe.customers.create({
    email: customer.email ?? undefined,
    name: `${customer.firstName} ${customer.lastName}`,
    metadata: { internalCustomerId: customer.id },
  });

  await db.update(schema.customer)
    .set({ stripeCustomerId: stripeCustomer.id })
    .where(eq(schema.customer.id, customer.id));

  return stripeCustomer.id;
}

/**
 * Create a PENDING payment record linked to a Stripe Checkout Session.
 */
export async function createPaymentRecord(data: {
  customerId: string;
  tattooSessionId: string;
  type: 'DEPOSIT' | 'SESSION_BALANCE';
  amount: number;
  stripeCheckoutSessionId: string;
}) {
  const [result] = await db.insert(schema.payment).values({
    customerId: data.customerId,
    tattooSessionId: data.tattooSessionId,
    type: data.type,
    status: 'PENDING',
    amount: data.amount,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId,
  }).returning();
  if (!result) throw new Error('Failed to create payment record: no result returned');
  return result;
}

/**
 * Get payments with pagination. Requires staff role.
 * Note: Payments don't have a searchVector column -- search param is a no-op.
 */
export const getPayments = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  amount: number;
  status: string;
  type: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  receiptUrl: string | null;
  completedAt: Date | null;
  createdAt: Date;
  tattooSessionId: string;
  customerId: string;
}>> => {
  await requireStaffRole();

  const results = await db.select({
    id: schema.payment.id,
    amount: schema.payment.amount,
    status: schema.payment.status,
    type: schema.payment.type,
    stripeCheckoutSessionId: schema.payment.stripeCheckoutSessionId,
    stripePaymentIntentId: schema.payment.stripePaymentIntentId,
    receiptUrl: schema.payment.receiptUrl,
    completedAt: schema.payment.completedAt,
    createdAt: schema.payment.createdAt,
    tattooSessionId: schema.payment.tattooSessionId,
    customerId: schema.payment.customerId,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.payment)
    .orderBy(desc(schema.payment.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const total = results[0]?.total ?? 0;

  return {
    data: results.map(({ total: _, ...row }) => row),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
});

/**
 * Get all payments for a given tattoo session. Requires staff role.
 */
export const getPaymentsBySession = cache(
  async (tattooSessionId: string) => {
    await requireStaffRole();
    return db.query.payment.findMany({
      where: eq(schema.payment.tattooSessionId, tattooSessionId),
      orderBy: [desc(schema.payment.createdAt)],
      with: {
        customer: {
          columns: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }
);

/**
 * Get a single payment with full customer and session details (for receipts).
 * Requires staff role.
 */
export const getPaymentWithDetails = cache(
  async (paymentId: string) => {
    await requireStaffRole();
    return db.query.payment.findFirst({
      where: eq(schema.payment.id, paymentId),
      with: {
        customer: true,
        tattooSession: true,
      },
    });
  }
);

/**
 * Get aggregate payment stats. Requires staff role.
 */
export const getPaymentStats = cache(async () => {
  await requireStaffRole();

  const [totalCollected, pendingAmount, refundedAmount, totalPaymentsResult] =
    await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(${schema.payment.amount}), 0)` })
        .from(schema.payment)
        .where(eq(schema.payment.status, 'COMPLETED')),
      db.select({ total: sql<number>`coalesce(sum(${schema.payment.amount}), 0)` })
        .from(schema.payment)
        .where(eq(schema.payment.status, 'PENDING')),
      db.select({ total: sql<number>`coalesce(sum(${schema.payment.amount}), 0)` })
        .from(schema.payment)
        .where(eq(schema.payment.status, 'REFUNDED')),
      db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.payment),
    ]);

  return {
    totalCollected: Number(totalCollected[0]?.total ?? 0),
    pendingAmount: Number(pendingAmount[0]?.total ?? 0),
    refundedAmount: Number(refundedAmount[0]?.total ?? 0),
    totalPayments: totalPaymentsResult[0]?.count ?? 0,
  };
});
