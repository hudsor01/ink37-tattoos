'use server';

import { stripe, dollarsToStripeCents } from '@/lib/stripe';
import {
  getOrCreateStripeCustomer,
  createPaymentRecord,
} from '@/lib/dal/payments';
import { getSessionById } from '@/lib/dal/sessions';
import { sendPaymentRequestEmail } from '@/lib/email/resend';
import {
  RequestDepositSchema,
  RequestBalanceSchema,
} from '@/lib/security/validation';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { validateGiftCard } from '@/lib/dal/gift-cards';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { env } from '@/lib/env';

/**
 * Request a deposit payment from a client (D-07, D-08, D-10).
 * Creates a Stripe Checkout Session, a PENDING Payment record,
 * and emails the payment link to the customer.
 */
export async function requestDepositAction(formData: FormData) {
  const session = await requireRole('admin');

  const validated = RequestDepositSchema.parse({
    sessionId: formData.get('sessionId'),
    amount: Number(formData.get('amount')),
  });

  const tattooSession = await getSessionById(validated.sessionId);
  if (!tattooSession) {
    throw new Error('Tattoo session not found');
  }

  // D-09: Optional gift card redemption
  const giftCardCode = formData.get('giftCardCode') as string | null;
  let discountAmount = 0;
  let giftCardCouponId: string | undefined;

  if (giftCardCode) {
    const giftCard = await validateGiftCard(giftCardCode);
    if (giftCard && giftCard.valid) {
      discountAmount = Math.min(giftCard.balance, validated.amount);
      const coupon = await stripe.coupons.create({
        amount_off: dollarsToStripeCents(discountAmount),
        currency: 'usd',
        duration: 'once',
        name: `Gift Card ${giftCardCode}`,
      });
      giftCardCouponId = coupon.id;
    }
  }

  // D-03: Get or create Stripe customer
  const stripeCustomerId = await getOrCreateStripeCustomer(
    tattooSession.customer
  );

  // D-07: Create Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tattoo Deposit - ${tattooSession.designDescription}`,
          },
          unit_amount: dollarsToStripeCents(validated.amount),
        },
        quantity: 1,
      },
    ],
    ...(giftCardCouponId && { discounts: [{ coupon: giftCardCouponId }] }),
    payment_intent_data: {
      receipt_email: tattooSession.customer.email ?? undefined,
      metadata: {
        tattooSessionId: validated.sessionId,
        paymentType: 'DEPOSIT',
        customerId: tattooSession.customerId,
      },
    },
    metadata: {
      tattooSessionId: validated.sessionId,
      paymentType: 'DEPOSIT',
      customerId: tattooSession.customerId,
      ...(giftCardCode && { giftCardCode, discountAmount: String(discountAmount) }),
    },
    success_url: `${env().NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env().NEXT_PUBLIC_APP_URL}/payment/cancelled`,
  });

  // Create PENDING payment record
  await createPaymentRecord({
    customerId: tattooSession.customerId,
    tattooSessionId: validated.sessionId,
    type: 'DEPOSIT',
    amount: validated.amount,
    stripeCheckoutSessionId: checkoutSession.id,
  });

  // D-09: Send payment request email
  if (tattooSession.customer.email) {
    await sendPaymentRequestEmail({
      to: tattooSession.customer.email,
      customerName: `${tattooSession.customer.firstName} ${tattooSession.customer.lastName}`,
      amount: validated.amount,
      type: 'deposit',
      paymentUrl: checkoutSession.url!,
    });
  }

  // Audit logging (runs after response)
  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'payment',
      resourceId: checkoutSession.id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: {
        type: 'DEPOSIT',
        amount: validated.amount,
        tattooSessionId: validated.sessionId,
      },
    })
  );

  revalidatePath('/dashboard/payments');

  return { success: true, checkoutUrl: checkoutSession.url };
}

/**
 * Request a balance payment from a client (D-07, D-09, D-10).
 * Calculates remaining balance (totalCost - paidAmount),
 * creates a Stripe Checkout Session, and emails the payment link.
 */
export async function requestBalanceAction(formData: FormData) {
  const session = await requireRole('admin');

  const validated = RequestBalanceSchema.parse({
    sessionId: formData.get('sessionId'),
  });

  const tattooSession = await getSessionById(validated.sessionId);
  if (!tattooSession) {
    throw new Error('Tattoo session not found');
  }

  // D-06: Calculate remaining balance
  const totalCost = Number(tattooSession.totalCost);
  const paidAmount = Number(tattooSession.paidAmount);
  const remainingBalance = totalCost - paidAmount;

  if (remainingBalance <= 0) {
    throw new Error('No remaining balance -- session is fully paid');
  }

  // D-09: Optional gift card redemption for balance payment
  const balanceGiftCardCode = formData.get('giftCardCode') as string | null;
  let balanceDiscountAmount = 0;
  let balanceGiftCardCouponId: string | undefined;

  if (balanceGiftCardCode) {
    const giftCard = await validateGiftCard(balanceGiftCardCode);
    if (giftCard && giftCard.valid) {
      balanceDiscountAmount = Math.min(giftCard.balance, remainingBalance);
      const coupon = await stripe.coupons.create({
        amount_off: dollarsToStripeCents(balanceDiscountAmount),
        currency: 'usd',
        duration: 'once',
        name: `Gift Card ${balanceGiftCardCode}`,
      });
      balanceGiftCardCouponId = coupon.id;
    }
  }

  // D-03: Get or create Stripe customer
  const stripeCustomerId = await getOrCreateStripeCustomer(
    tattooSession.customer
  );

  // D-07: Create Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tattoo Session Balance - ${tattooSession.designDescription}`,
          },
          unit_amount: dollarsToStripeCents(remainingBalance),
        },
        quantity: 1,
      },
    ],
    ...(balanceGiftCardCouponId && { discounts: [{ coupon: balanceGiftCardCouponId }] }),
    payment_intent_data: {
      receipt_email: tattooSession.customer.email ?? undefined,
      metadata: {
        tattooSessionId: validated.sessionId,
        paymentType: 'SESSION_BALANCE',
        customerId: tattooSession.customerId,
      },
    },
    metadata: {
      tattooSessionId: validated.sessionId,
      paymentType: 'SESSION_BALANCE',
      customerId: tattooSession.customerId,
      ...(balanceGiftCardCode && { giftCardCode: balanceGiftCardCode, discountAmount: String(balanceDiscountAmount) }),
    },
    success_url: `${env().NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env().NEXT_PUBLIC_APP_URL}/payment/cancelled`,
  });

  // Create PENDING payment record
  await createPaymentRecord({
    customerId: tattooSession.customerId,
    tattooSessionId: validated.sessionId,
    type: 'SESSION_BALANCE',
    amount: remainingBalance,
    stripeCheckoutSessionId: checkoutSession.id,
  });

  // D-09: Send payment request email
  if (tattooSession.customer.email) {
    await sendPaymentRequestEmail({
      to: tattooSession.customer.email,
      customerName: `${tattooSession.customer.firstName} ${tattooSession.customer.lastName}`,
      amount: remainingBalance,
      type: 'balance',
      paymentUrl: checkoutSession.url!,
    });
  }

  // Audit logging (runs after response)
  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'payment',
      resourceId: checkoutSession.id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: {
        type: 'SESSION_BALANCE',
        amount: remainingBalance,
        tattooSessionId: validated.sessionId,
      },
    })
  );

  revalidatePath('/dashboard/payments');

  return { success: true, checkoutUrl: checkoutSession.url };
}
