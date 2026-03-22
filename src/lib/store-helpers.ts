import { randomBytes } from 'node:crypto';

/**
 * Generate a gift card code in INK37-XXXX-XXXX-XXXX format (D-11).
 * Uses crypto.randomBytes for security. Excludes I/O/0/1 for readability.
 */
export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  const segments: string[] = [];

  for (let seg = 0; seg < 3; seg++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars[bytes[seg * 4 + i]! % chars.length];
    }
    segments.push(segment);
  }

  return `INK37-${segments.join('-')}`;
}

/** Format a number as USD currency string. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/** Gift card preset denominations in dollars (D-10). */
export const GIFT_CARD_DENOMINATIONS = [25, 50, 100, 200, 500] as const;
export type GiftCardDenomination = (typeof GIFT_CARD_DENOMINATIONS)[number];

/** Flat shipping rate in cents for Stripe (D-07). $7.99 standard. */
export const SHIPPING_RATE_CENTS = 799;
/** Free shipping threshold in dollars (D-07). */
export const FREE_SHIPPING_THRESHOLD = 50;
/** Download link expiry in hours (D-16). */
export const DOWNLOAD_LINK_EXPIRY_HOURS = 72;
/** Max downloads per token (D-16). */
export const MAX_DOWNLOADS_PER_TOKEN = 5;
