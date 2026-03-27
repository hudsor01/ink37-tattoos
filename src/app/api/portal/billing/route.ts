import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { env } from '@/lib/env';

/**
 * POST /api/portal/billing
 * Creates a Stripe Customer Portal session for the authenticated user.
 * Redirects to Stripe's hosted portal where customers can view invoices,
 * payment methods, and payment history.
 *
 * Requires: authenticated user with linked customer record + stripeCustomerId.
 */
export async function POST() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find the customer record linked to this user
  const customer = await db.query.customer.findFirst({
    where: eq(schema.customer.userId, session.user.id),
    columns: { id: true, stripeCustomerId: true },
  });

  if (!customer) {
    return NextResponse.json(
      { error: 'No customer record linked to your account' },
      { status: 404 }
    );
  }

  if (!customer.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No Stripe customer found. Payment history is not available yet.' },
      { status: 404 }
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${env().NEXT_PUBLIC_APP_URL}/portal/payments`,
  });

  return NextResponse.json({ url: portalSession.url });
}
