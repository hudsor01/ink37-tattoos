import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { eq, and, gte, desc, sql, ilike, or } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { generateGiftCardCode } from '@/lib/store-helpers';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!STAFF_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

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

/**
 * Get paginated gift cards list. Requires staff role.
 */
export const getGiftCards = cache(async (
  params: { page?: number; pageSize?: number; search?: string } = {}
) => {
  await requireStaffRole();

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = params.search
    ? or(
        ilike(schema.giftCard.code, `%${params.search}%`),
        ilike(schema.giftCard.recipientEmail, `%${params.search}%`),
        ilike(schema.giftCard.recipientName, `%${params.search}%`),
        ilike(schema.giftCard.purchaserEmail, `%${params.search}%`)
      )
    : undefined;

  const [data, countResult] = await Promise.all([
    db.select({
      id: schema.giftCard.id,
      code: schema.giftCard.code,
      initialBalance: schema.giftCard.initialBalance,
      balance: schema.giftCard.balance,
      isActive: schema.giftCard.isActive,
      purchaserEmail: schema.giftCard.purchaserEmail,
      recipientEmail: schema.giftCard.recipientEmail,
      recipientName: schema.giftCard.recipientName,
      createdAt: schema.giftCard.createdAt,
    })
      .from(schema.giftCard)
      .where(conditions)
      .orderBy(desc(schema.giftCard.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(schema.giftCard)
      .where(conditions),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

/**
 * Deactivate a gift card. Requires staff role.
 */
export async function deactivateGiftCard(id: string) {
  await requireStaffRole();
  const [result] = await db.update(schema.giftCard)
    .set({ isActive: false })
    .where(eq(schema.giftCard.id, id))
    .returning();
  if (!result) throw new Error('Gift card not found');
  return result;
}
