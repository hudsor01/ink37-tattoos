import 'server-only';
import { db } from '@/lib/db';
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
  return db.giftCard.create({
    data: {
      code,
      initialBalance: data.initialBalance,
      balance: data.initialBalance,
      purchaserEmail: data.purchaserEmail,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      senderName: data.senderName,
      personalMessage: data.personalMessage,
      orderId: data.orderId,
    },
  });
}

/**
 * Validate a gift card by code. Returns validity and remaining balance.
 * No auth -- called from checkout actions.
 */
export async function validateGiftCard(code: string): Promise<{ valid: boolean; balance: number } | null> {
  const giftCard = await db.giftCard.findUnique({ where: { code } });
  if (!giftCard) return null;

  return {
    valid: giftCard.isActive && Number(giftCard.balance) > 0,
    balance: Number(giftCard.balance),
  };
}

/**
 * Redeem a gift card by atomically decrementing its balance.
 * Uses Prisma conditional update to prevent over-redemption.
 * No auth -- called from webhook handler.
 */
export async function redeemGiftCard(data: {
  code: string;
  amount: number;
}): Promise<{ success: boolean; remainingBalance?: number; error?: string }> {
  try {
    const updated = await db.giftCard.update({
      where: {
        code: data.code,
        balance: { gte: data.amount },
      },
      data: {
        balance: { decrement: data.amount },
      },
    });
    return { success: true, remainingBalance: Number(updated.balance) };
  } catch (error: unknown) {
    // Prisma P2025: record not found (balance insufficient or code invalid)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return { success: false, error: 'Insufficient balance' };
    }
    throw error;
  }
}

/**
 * Get a gift card by its code. No auth -- called from validation.
 */
export async function getGiftCardByCode(code: string) {
  return db.giftCard.findUnique({ where: { code } });
}
