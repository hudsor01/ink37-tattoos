import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | undefined;
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-02-25.clover',
        typescript: true,
      });
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Convert dollar amount (Decimal/number) to Stripe cents (integer). Uses Math.round to avoid floating-point errors. */
export function dollarsToStripeCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert Stripe cents (integer) to dollar amount (number). */
export function stripeCentsToDollars(cents: number): number {
  return cents / 100;
}

/** Create a SetupIntent for saving a payment method to a Stripe customer. */
export async function createSetupIntent(stripeCustomerId: string) {
  return stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
  });
}

/** List saved payment methods (cards) for a Stripe customer. */
export async function listPaymentMethods(stripeCustomerId: string) {
  const methods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  });
  return methods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? 'unknown',
    last4: pm.card?.last4 ?? '****',
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
  }));
}
