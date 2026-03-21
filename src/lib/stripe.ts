import 'server-only';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-18.acacia',
  typescript: true,
});

/** Convert dollar amount (Decimal/number) to Stripe cents (integer). Uses Math.round to avoid floating-point errors. */
export function dollarsToStripeCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert Stripe cents (integer) to dollar amount (number). */
export function stripeCentsToDollars(cents: number): number {
  return cents / 100;
}
