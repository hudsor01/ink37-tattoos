import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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

  await db.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: stripeCustomer.id },
  });

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
  return db.payment.create({
    data: {
      customerId: data.customerId,
      tattooSessionId: data.tattooSessionId,
      type: data.type,
      status: 'PENDING',
      amount: data.amount,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId,
    },
  });
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
    return db.payment.findMany({
      where: {
        ...(filters?.status && {
          status: filters.status as
            | 'PENDING'
            | 'PROCESSING'
            | 'COMPLETED'
            | 'FAILED'
            | 'REFUNDED',
        }),
        ...(filters?.type && {
          type: filters.type as 'DEPOSIT' | 'SESSION_BALANCE' | 'REFUND',
        }),
        ...(filters?.customerId && { customerId: filters.customerId }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        tattooSession: {
          select: { designDescription: true, totalCost: true },
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
    return db.payment.findMany({
      where: { tattooSessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true },
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

  const [totalCollected, pendingAmount, refundedAmount, totalPayments] =
    await Promise.all([
      db.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PENDING' },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'REFUNDED' },
      }),
      db.payment.count(),
    ]);

  return {
    totalCollected: Number(totalCollected._sum.amount ?? 0),
    pendingAmount: Number(pendingAmount._sum.amount ?? 0),
    refundedAmount: Number(refundedAmount._sum.amount ?? 0),
    totalPayments,
  };
});
