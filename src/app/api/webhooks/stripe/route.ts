import { NextResponse } from 'next/server';
import { stripe, stripeCentsToDollars } from '@/lib/stripe';
import { db } from '@/lib/db';
import type Stripe from 'stripe';
import { getOrderByCheckoutSessionId } from '@/lib/dal/orders';
import { createGiftCard, redeemGiftCard } from '@/lib/dal/gift-cards';
import { sendOrderConfirmationEmail, sendGiftCardEmail } from '@/lib/email/resend';

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
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const orderType = checkoutSession.metadata?.orderType;
        if (orderType === 'store') {
          await handleStoreCheckoutCompleted(checkoutSession);
        } else if (orderType === 'gift_card') {
          await handleGiftCardCheckoutCompleted(checkoutSession);
        } else {
          await handleCheckoutCompleted(checkoutSession);
        }
        break;
      }
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
 * D-15: Tattoo payment checkout completed -- atomically update Payment status
 * and TattooSession.paidAmount with receipt URL.
 * Extended for D-09: redeem gift card if present in metadata.
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

  // D-09: Redeem gift card if used in this tattoo payment
  const giftCardCode = session.metadata?.giftCardCode;
  if (giftCardCode) {
    const discountAmount = Number(session.metadata?.discountAmount ?? 0);
    if (discountAmount > 0) {
      await redeemGiftCard({ code: giftCardCode, amount: discountAmount });
    }
  }
}

/**
 * Handle store checkout completed.
 * Updates order to PAID, redeems gift card if used, sends confirmation email.
 */
async function handleStoreCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error('Store checkout session missing orderId in metadata');
    return;
  }

  const stripePaymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  // Update order to PAID with shipping and email details
  const shippingDetails = session.collected_information?.shipping_details;
  await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      stripePaymentIntentId: stripePaymentIntentId ?? null,
      email: session.customer_details?.email ?? '',
      ...(shippingDetails && {
        shippingName: shippingDetails.name ?? null,
        shippingAddress: shippingDetails.address?.line1 ?? null,
        shippingCity: shippingDetails.address?.city ?? null,
        shippingState: shippingDetails.address?.state ?? null,
        shippingPostalCode: shippingDetails.address?.postal_code ?? null,
        shippingCountry: shippingDetails.address?.country ?? null,
      }),
      shippingAmount: stripeCentsToDollars(session.total_details?.amount_shipping ?? 0),
      total: stripeCentsToDollars(session.amount_total ?? 0),
    },
  });

  // Redeem gift card if used
  const giftCardCode = session.metadata?.giftCardCode;
  if (giftCardCode) {
    const discountAmount = Number(session.metadata?.discountAmount ?? 0);
    if (discountAmount > 0) {
      await redeemGiftCard({ code: giftCardCode, amount: discountAmount });
    }
  }

  // Send order confirmation email
  const order = await getOrderByCheckoutSessionId(session.id);
  if (order && session.customer_details?.email) {
    const hasDigitalItems = order.items.some(
      (item) => item.product.productType === 'DIGITAL'
    );

    await sendOrderConfirmationEmail({
      to: session.customer_details.email,
      orderId: order.id,
      items: order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.totalPrice),
      })),
      subtotal: Number(order.subtotal),
      shipping: Number(order.shippingAmount),
      discount: Number(order.discountAmount),
      total: Number(order.total),
      hasDigitalItems,
      downloadUrl: hasDigitalItems
        ? `${process.env.NEXT_PUBLIC_APP_URL}/store/downloads/${order.id}`
        : undefined,
    });
  }
}

/**
 * Handle gift card purchase completed.
 * Creates the gift card record and sends the delivery email.
 */
async function handleGiftCardCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const denomination = Number(session.metadata?.denomination ?? 0);
  const recipientName = session.metadata?.recipientName ?? '';
  const recipientEmail = session.metadata?.recipientEmail ?? '';
  const senderName = session.metadata?.senderName ?? '';
  const personalMessage = session.metadata?.personalMessage || undefined;
  const purchaserEmail = session.customer_details?.email ?? '';

  if (!denomination || !recipientEmail) {
    console.error('Gift card checkout missing required metadata');
    return;
  }

  // Create the gift card
  const giftCard = await createGiftCard({
    initialBalance: denomination,
    purchaserEmail,
    recipientEmail,
    recipientName: recipientName || undefined,
    senderName: senderName || undefined,
    personalMessage,
  });

  // Send gift card delivery email to recipient
  await sendGiftCardEmail({
    to: recipientEmail,
    recipientName: recipientName || 'Friend',
    senderName: senderName || 'Someone special',
    amount: denomination,
    code: giftCard.code,
    personalMessage,
  });
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
