import 'server-only';
import { db } from '@/lib/db';
import { eq, and, gte, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { generateGiftCardCode } from '@/lib/store-helpers';

/**
 * Create a new gift card. No auth -- called from webhook handler after payment.
 */
export async function createGiftCard(data: {
  initialBalance: number;
  purchaserEmail: string;
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  personalMessage?: string;
  orderId?: string;
}) {
  const code = generateGiftCardCode();
  const [result] = await db.insert(schema.giftCard).values({
    code,
    initialBalance: data.initialBalance,
    balance: data.initialBalance,
    purchaserEmail: data.purchaserEmail,
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    senderName: data.senderName,
    personalMessage: data.personalMessage,
    orderId: data.orderId,
  }).returning();
  return result;
}

/**
 * Validate a gift card by code. Returns validity and remaining balance.
 * No auth -- called from checkout actions.
 */
export async function validateGiftCard(code: string): Promise<{ valid: boolean; balance: number } | null> {
  const giftCard = await db.query.giftCard.findFirst({
    where: eq(schema.giftCard.code, code),
  });
  if (!giftCard) return null;

  return {
    valid: giftCard.isActive && Number(giftCard.balance) > 0,
    balance: Number(giftCard.balance),
  };
}

/**
 * Redeem a gift card by atomically decrementing its balance.
 * Uses conditional update to prevent over-redemption.
 * No auth -- called from webhook handler.
 */
export async function redeemGiftCard(data: {
  code: string;
  amount: number;
}): Promise<{ success: boolean; remainingBalance?: number; error?: string }> {
  // Drizzle update returns empty array if no rows match the where condition
  const [updated] = await db.update(schema.giftCard)
    .set({
      balance: sql`${schema.giftCard.balance} - ${data.amount}`,
    })
    .where(and(
      eq(schema.giftCard.code, data.code),
      gte(schema.giftCard.balance, data.amount),
    ))
    .returning();

  if (!updated) {
    return { success: false, error: 'Insufficient balance' };
  }

  return { success: true, remainingBalance: Number(updated.balance) };
}

/**
 * Get a gift card by its code. No auth -- called from validation.
 */
export async function getGiftCardByCode(code: string) {
  return db.query.giftCard.findFirst({
    where: eq(schema.giftCard.code, code),
  });
}
