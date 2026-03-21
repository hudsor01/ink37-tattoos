import { NextResponse } from 'next/server';
import { stripe, stripeCentsToDollars } from '@/lib/stripe';
import { db } from '@/lib/db';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  // D-13 / SEC-05: Raw body for signature verification
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // D-12: Idempotency -- check if event already processed
  const existingEvent = await db.stripeEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  try {
    // D-14: Handle specified event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
    }

    // Mark event as processed (D-12)
    await db.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        processedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * D-15: Checkout completed -- atomically update Payment status
 * and TattooSession.paidAmount with receipt URL.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const tattooSessionId = session.metadata?.tattooSessionId;
  if (!tattooSessionId) {
    console.error('Checkout session missing tattooSessionId in metadata');
    return;
  }

  let stripePaymentIntentId: string | undefined;
  let receiptUrl: string | null = null;

  // Retrieve PaymentIntent and Charge for receipt URL (D-16, PAY-05)
  if (session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    );
    stripePaymentIntentId = paymentIntent.id;

    if (paymentIntent.latest_charge) {
      const charge = await stripe.charges.retrieve(
        paymentIntent.latest_charge as string
      );
      receiptUrl = charge.receipt_url ?? null;
    }
  }

  const amountInDollars = stripeCentsToDollars(session.amount_total ?? 0);

  // D-15: Atomic transaction -- update Payment + TattooSession
  await db.$transaction([
    db.payment.updateMany({
      where: { stripeCheckoutSessionId: session.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        receiptUrl,
        completedAt: new Date(),
      },
    }),
    db.tattooSession.update({
      where: { id: tattooSessionId },
      data: {
        paidAmount: { increment: amountInDollars },
      },
    }),
  ]);
}

/**
 * Safety net: if payment_intent.succeeded fires after checkout.session.completed,
 * update any matching Payment to COMPLETED (if not already done).
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const existingPayment = await db.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!existingPayment || existingPayment.status === 'COMPLETED') {
    return; // Already handled or not our payment
  }

  await db.payment.update({
    where: { id: existingPayment.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });
}

/**
 * Mark payment as FAILED when Stripe payment intent fails.
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const tattooSessionId =
    paymentIntent.metadata?.tattooSessionId;

  if (!tattooSessionId) return;

  // Find by checkout session ID via metadata, or by payment intent ID
  await db.payment.updateMany({
    where: {
      OR: [
        { stripePaymentIntentId: paymentIntent.id },
        {
          tattooSessionId,
          status: 'PENDING',
        },
      ],
    },
    data: { status: 'FAILED' },
  });
}

/**
 * Handle refunds -- update Payment to REFUNDED and decrement
 * TattooSession.paidAmount by the refunded amount atomically.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  if (!charge.payment_intent) return;

  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent.id;

  const payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!payment) return;

  const refundedDollars = stripeCentsToDollars(charge.amount_refunded);

  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    }),
    db.tattooSession.update({
      where: { id: payment.tattooSessionId },
      data: {
        paidAmount: { decrement: refundedDollars },
      },
    }),
  ]);
}
