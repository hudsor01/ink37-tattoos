'use server';

import { z } from 'zod';
import { createGiftCard, deactivateGiftCard } from '@/lib/dal/gift-cards';
import { sendGiftCardEmail } from '@/lib/email/resend';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

const IssueGiftCardSchema = z.object({
  amount: z.number().min(5, 'Minimum $5').max(500, 'Maximum $500'),
  recipientEmail: z.string().email('Valid email required'),
  recipientName: z.string().optional(),
});

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function issueGiftCardAction(data: {
  amount: number;
  recipientEmail: string;
  recipientName?: string;
}): Promise<ActionResult<{ code: string; emailFailed: boolean }>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const parsed = IssueGiftCardSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (messages) fieldErrors[key] = messages;
    }
    return { success: false, error: 'Validation failed', fieldErrors };
  }

  try {
    const result = await createGiftCard({
      initialBalance: parsed.data.amount,
      purchaserEmail: session.user.email,
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
    });

    // Attempt to send email, but don't fail the action if it doesn't work
    let emailFailed = false;
    try {
      await sendGiftCardEmail({
        to: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName || 'Valued Customer',
        senderName: session.user.name || 'Ink 37 Tattoos',
        amount: parsed.data.amount,
        code: result.code,
      });
    } catch (emailError) {
      logger.error({ err: emailError }, 'Gift card email delivery failed');
      emailFailed = true;
    }

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'giftCard',
        resourceId: result.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { amount: parsed.data.amount, recipientEmail: parsed.data.recipientEmail, emailFailed },
      })
    );

    revalidatePath('/dashboard/gift-cards');
    return { success: true, data: { code: result.code, emailFailed } };
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    logger.error({ err: error }, 'Issue gift card failed');
    return { success: false, error: 'Failed to issue gift card' };
  }
}

export async function deactivateGiftCardAction(id: string): Promise<ActionResult<void>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  try {
    await deactivateGiftCard(id);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'giftCard',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { deactivated: true },
      })
    );

    revalidatePath('/dashboard/gift-cards');
    return { success: true, data: undefined };
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    logger.error({ err: error }, 'Deactivate gift card failed');
    return { success: false, error: 'Failed to deactivate gift card' };
  }
}
