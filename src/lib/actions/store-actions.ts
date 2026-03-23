'use server';

import { stripe, dollarsToStripeCents } from '@/lib/stripe';
import { db } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { validateGiftCard } from '@/lib/dal/gift-cards';
import { createOrder } from '@/lib/dal/orders';
import { StoreCheckoutSchema } from '@/lib/security/validation';
import { SHIPPING_RATE_CENTS, FREE_SHIPPING_THRESHOLD } from '@/lib/store-helpers';
import { env } from '@/lib/env';
import type Stripe from 'stripe';

/**
 * Store checkout action (D-05, D-08). No auth required -- guest checkout.
 * Looks up products, builds Stripe line items, creates pending order, returns checkout URL.
 */
export async function storeCheckoutAction(data: {
  items: Array<{ productId: string; quantity: number }>;
  giftCardCode?: string;
}) {
  const validated = StoreCheckoutSchema.parse(data);

  // Look up all products
  const products = await db.query.product.findMany({
    where: and(
      inArray(schema.product.id, validated.items.map((i) => i.productId)),
      eq(schema.product.isActive, true),
    ),
  });

  if (products.length !== validated.items.length) {
    return { success: false, error: 'One or more products not found or unavailable' };
  }

  // Build line items and determine cart composition
  let hasPhysicalItems = false;
  let cartTotal = 0;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: Array<{
    productId: string;
    productName: string;
    productType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  // D-07: Guard against products without Stripe price IDs
  const missingPriceProducts = products.filter((p) => !p.stripePriceId);
  if (missingPriceProducts.length > 0) {
    return {
      success: false,
      error: 'One or more products are not available for purchase. Please try again later.',
    };
  }

  for (const cartItem of validated.items) {
    const product = products.find((p) => p.id === cartItem.productId)!;
    const unitPrice = Number(product.price);
    const totalPrice = unitPrice * cartItem.quantity;
    cartTotal += totalPrice;

    if (product.productType === 'PHYSICAL') {
      hasPhysicalItems = true;
    }

    lineItems.push({
      price: product.stripePriceId!,
      quantity: cartItem.quantity,
    });

    orderItems.push({
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      quantity: cartItem.quantity,
      unitPrice,
      totalPrice,
    });
  }

  // Build Stripe session params
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/store/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/store/checkout/cancelled`,
    customer_email: undefined, // Stripe will collect
    metadata: {
      orderType: 'store',
    },
  };

  // Shipping for physical items
  if (hasPhysicalItems) {
    sessionParams.shipping_address_collection = { allowed_countries: ['US'] };
    sessionParams.shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: SHIPPING_RATE_CENTS, currency: 'usd' },
          display_name: 'Standard Shipping',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 5 },
            maximum: { unit: 'business_day', value: 10 },
          },
        },
      },
      ...(cartTotal >= FREE_SHIPPING_THRESHOLD
        ? [
            {
              shipping_rate_data: {
                type: 'fixed_amount' as const,
                fixed_amount: { amount: 0, currency: 'usd' },
                display_name: 'Free Shipping',
                delivery_estimate: {
                  minimum: { unit: 'business_day' as const, value: 5 },
                  maximum: { unit: 'business_day' as const, value: 10 },
                },
              },
            },
          ]
        : []),
    ];
  }

  // Gift card discount
  let discountAmount = 0;
  if (validated.giftCardCode) {
    const giftCard = await validateGiftCard(validated.giftCardCode);
    if (giftCard && giftCard.valid) {
      discountAmount = Math.min(giftCard.balance, cartTotal);
      const coupon = await stripe.coupons.create({
        amount_off: dollarsToStripeCents(discountAmount),
        currency: 'usd',
        duration: 'once',
        name: `Gift Card ${validated.giftCardCode}`,
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }
  }

  // Create pending order
  const order = await createOrder({
    email: '',  // Will be filled by webhook from Stripe session
    subtotal: cartTotal,
    shippingAmount: 0,  // Will be determined at Stripe checkout
    discountAmount,
    total: cartTotal - discountAmount,
    stripeCheckoutSessionId: '',  // Will be updated after session creation
    giftCardCode: validated.giftCardCode,
    items: orderItems,
  });

  // Add orderId to metadata
  sessionParams.metadata!.orderId = order.id;
  if (validated.giftCardCode) {
    sessionParams.metadata!.giftCardCode = validated.giftCardCode;
    sessionParams.metadata!.discountAmount = String(discountAmount);
  }

  // Create Stripe Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

  // Update order with the Stripe checkout session ID
  await db.update(schema.order)
    .set({ stripeCheckoutSessionId: checkoutSession.id })
    .where(eq(schema.order.id, order.id));

  return { success: true, checkoutUrl: checkoutSession.url };
}
