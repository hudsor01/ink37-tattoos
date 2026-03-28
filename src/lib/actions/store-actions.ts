'use server';

import { stripe, dollarsToStripeCents } from '@/lib/stripe';
import { db } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { validateGiftCard } from '@/lib/dal/gift-cards';
import { logAudit } from '@/lib/dal/audit';
import { StoreCheckoutSchema } from '@/lib/security/validation';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { SHIPPING_RATE_CENTS, FREE_SHIPPING_THRESHOLD } from '@/lib/store-helpers';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { env } from '@/lib/env';
import type Stripe from 'stripe';

/**
 * Store checkout action (D-05, D-08). No auth required -- guest checkout.
 * Looks up products, builds Stripe line items, creates pending order, returns checkout URL.
 */
export async function storeCheckoutAction(data: {
  items: Array<{ productId: string; quantity: number }>;
  giftCardCode?: string;
}): Promise<ActionResult<{ checkoutUrl: string | null }>> {
  return safeAction(async () => {
    const validated = StoreCheckoutSchema.parse(data);

    // Look up all products
    const products = await db.query.product.findMany({
      where: and(
        inArray(schema.product.id, validated.items.map((i) => i.productId)),
        eq(schema.product.isActive, true),
      ),
    });

    if (products.length !== validated.items.length) {
      throw new Error('One or more products not found or unavailable');
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
      throw new Error('One or more products are not available for purchase. Please try again later.');
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
      success_url: `${env().NEXT_PUBLIC_APP_URL}/store/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env().NEXT_PUBLIC_APP_URL}/store/checkout/cancelled`,
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

    // Validate gift card if provided
    const giftCard = validated.giftCardCode
      ? await validateGiftCard(validated.giftCardCode)
      : null;

    let discountAmount = 0;
    if (giftCard?.valid) {
      discountAmount = Math.min(giftCard.balance, cartTotal);
      const coupon = await stripe.coupons.create({
        amount_off: dollarsToStripeCents(discountAmount),
        currency: 'usd',
        duration: 'once',
        name: `Gift Card ${validated.giftCardCode}`,
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    if (validated.giftCardCode) {
      sessionParams.metadata!.giftCardCode = validated.giftCardCode;
      sessionParams.metadata!.discountAmount = String(discountAmount);
    }

    // Use a transaction to atomically create order + Stripe session + link them.
    // If Stripe session creation fails, the order is rolled back.
    const result = await db.transaction(async (tx) => {
      // 1. Create order inside the transaction
      const [order] = await tx.insert(schema.order).values({
        email: '',  // Will be filled by webhook from Stripe session
        subtotal: cartTotal,
        shippingAmount: 0,  // Will be determined at Stripe checkout
        discountAmount,
        total: cartTotal - discountAmount,
        stripeCheckoutSessionId: '',  // Will be updated after session creation
        giftCardCode: validated.giftCardCode,
      }).returning();

      // 2. Create order items
      await Promise.all(
        orderItems.map((item) =>
          tx.insert(schema.orderItem).values({
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })
        )
      );

      // 3. Create Stripe session with orderId in metadata
      sessionParams.metadata!.orderId = order.id;
      const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

      // 4. Link Stripe session ID back to order
      await tx.update(schema.order)
        .set({ stripeCheckoutSessionId: checkoutSession.id })
        .where(eq(schema.order.id, order.id));

      return { checkoutUrl: checkoutSession.url, orderId: order.id, checkoutSessionId: checkoutSession.id };
    });

    // Audit logging for public store checkout (anonymous)
    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: 'anonymous',
        action: 'CREATE',
        resource: 'store_checkout',
        resourceId: result.orderId,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { itemCount: validated.items.length, cartTotal, discountAmount },
      })
    );

    return { checkoutUrl: result.checkoutUrl };
  });
}
