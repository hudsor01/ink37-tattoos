'use server';

import { stripe, dollarsToStripeCents } from '@/lib/stripe';
import { validateGiftCard } from '@/lib/dal/gift-cards';
import { PurchaseGiftCardSchema, RedeemGiftCardSchema } from '@/lib/security/validation';
import { env } from '@/lib/env';

/**
 * Purchase a gift card. No auth required -- guest purchase.
 * Creates a Stripe Checkout session for the gift card amount.
 */
export async function purchaseGiftCardAction(data: {
  denomination: string;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  personalMessage?: string;
}) {
  const validated = PurchaseGiftCardSchema.parse(data);
  const amount = Number(validated.denomination);

  // Create Stripe Checkout session for gift card
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Ink 37 Gift Card - $${amount}`,
          },
          unit_amount: dollarsToStripeCents(amount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderType: 'gift_card',
      denomination: String(amount),
      recipientName: validated.recipientName,
      recipientEmail: validated.recipientEmail,
      senderName: validated.senderName,
      personalMessage: validated.personalMessage ?? '',
    },
    success_url: `${env().NEXT_PUBLIC_APP_URL}/store/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env().NEXT_PUBLIC_APP_URL}/store/checkout/cancelled`,
  });

  return { success: true, checkoutUrl: checkoutSession.url };
}

/**
 * Validate a gift card code and return its balance.
 * No auth required -- used at checkout.
 */
export async function validateGiftCardAction(code: string) {
  const validated = RedeemGiftCardSchema.parse({ code });
  const result = await validateGiftCard(validated.code);

  if (!result) {
    return { valid: false, error: 'Invalid gift card code' };
  }

  return { valid: result.valid, balance: result.balance };
}
