'use server';

import { stripe, dollarsToStripeCents } from '@/lib/stripe';
import { validateGiftCard } from '@/lib/dal/gift-cards';
import { logAudit } from '@/lib/dal/audit';
import { PurchaseGiftCardSchema, RedeemGiftCardSchema } from '@/lib/security/validation';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
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
}): Promise<ActionResult<{ checkoutUrl: string | null }>> {
  return safeAction(async () => {
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

    // Audit logging for public gift card purchase (anonymous)
    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: 'anonymous',
        action: 'CREATE',
        resource: 'gift_card_purchase',
        resourceId: checkoutSession.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { amount, recipientEmail: validated.recipientEmail, senderName: validated.senderName },
      })
    );

    return { checkoutUrl: checkoutSession.url };
  });
}

/**
 * Validate a gift card code and return its balance.
 * No auth required -- used at checkout.
 */
export async function validateGiftCardAction(code: string): Promise<ActionResult<{ valid: boolean; balance?: number }>> {
  return safeAction(async () => {
    const validated = RedeemGiftCardSchema.parse({ code });
    const result = await validateGiftCard(validated.code);

    if (!result) {
      return { valid: false };
    }

    return { valid: result.valid, balance: result.balance };
  });
}
