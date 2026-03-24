import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
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
  return result;
}

/**
 * Get payments with optional filters. Requires staff role.
 */
export const getPayments = cache(
  async (filters?: {
    status?: string;
    type?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }) => {
    await requireStaffRole();

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(schema.payment.status, filters.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'));
    }
    if (filters?.type) {
      conditions.push(eq(schema.payment.type, filters.type as 'DEPOSIT' | 'SESSION_BALANCE' | 'REFUND'));
    }
    if (filters?.customerId) {
      conditions.push(eq(schema.payment.customerId, filters.customerId));
    }

    return db.query.payment.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.payment.createdAt)],
      limit: filters?.limit ?? 50,
      offset: filters?.offset ?? 0,
      with: {
        customer: {
          columns: { firstName: true, lastName: true, email: true },
        },
        tattooSession: {
          columns: { designDescription: true, totalCost: true },
        },
      },
    });
  }
);

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
