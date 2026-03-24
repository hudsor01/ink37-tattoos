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
