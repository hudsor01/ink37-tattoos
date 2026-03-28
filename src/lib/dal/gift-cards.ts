import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq, and, gte, sql, desc, ilike, or } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { generateGiftCardCode } from '@/lib/store-helpers';
import type { PaginationParams, PaginatedResult } from './types';
import { DEFAULT_PAGE_SIZE } from './types';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');
  if (!STAFF_ROLES.includes(session.user.role)) {
    throw new Error('Insufficient permissions: requires staff role or above');
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
  if (!result) throw new Error('Failed to create gift card: no result returned');
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
 * Get gift cards with pagination for admin list. Requires staff role.
 * Gift cards don't have tsvector -- uses ILIKE fallback for search by code/email.
 */
export const getGiftCards = cache(async (
  params: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
): Promise<PaginatedResult<{
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  isActive: boolean;
  purchaserEmail: string;
  recipientEmail: string;
  recipientName: string | null;
  createdAt: Date;
}>> => {
  await requireStaffRole();

  const conditions = [];
  if (params.search) {
    conditions.push(
      or(
        ilike(schema.giftCard.code, `%${params.search}%`),
        ilike(schema.giftCard.purchaserEmail, `%${params.search}%`),
        ilike(schema.giftCard.recipientEmail, `%${params.search}%`),
        ilike(schema.giftCard.recipientName, `%${params.search}%`),
      )
    );
  }

  const results = await db.select({
    id: schema.giftCard.id,
    code: schema.giftCard.code,
    initialBalance: schema.giftCard.initialBalance,
    balance: schema.giftCard.balance,
    isActive: schema.giftCard.isActive,
    purchaserEmail: schema.giftCard.purchaserEmail,
    recipientEmail: schema.giftCard.recipientEmail,
    recipientName: schema.giftCard.recipientName,
    createdAt: schema.giftCard.createdAt,
    total: sql<number>`cast(count(*) over() as integer)`,
  })
    .from(schema.giftCard)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.giftCard.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const total = results[0]?.total ?? 0;

  return {
    data: results.map(({ total: _, ...row }) => row),
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
});
