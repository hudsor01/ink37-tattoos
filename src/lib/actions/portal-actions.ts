'use server';

import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { ConsentSignSchema, UpdatePortalProfileSchema } from '@/lib/security/validation';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Sign consent for a tattoo session.
 * Validates input, verifies ownership (IDOR protection), prevents re-signing (D-10).
 */
export async function signConsentAction(formData: FormData): Promise<ActionResult<void>> {
  const session = await requireRole('user');

  return safeAction(async () => {
    const validated = ConsentSignSchema.parse({
      sessionId: formData.get('sessionId'),
      signedName: formData.get('signedName'),
      acknowledged: formData.get('acknowledged') === 'true',
    });

    // Verify the user has a linked Customer record
    const customer = await db.query.customer.findFirst({
      where: eq(schema.customer.userId, session.user.id),
    });

    if (!customer) {
      throw new Error('No linked customer account found.');
    }

    // Find the tattoo session -- ownership check via customerId prevents IDOR
    const tattooSession = await db.query.tattooSession.findFirst({
      where: and(
        eq(schema.tattooSession.id, validated.sessionId),
        eq(schema.tattooSession.customerId, customer.id),
      ),
    });

    if (!tattooSession) {
      throw new Error('Tattoo session not found.');
    }

    // D-10: Cannot re-sign if already signed
    if (tattooSession.consentSignedAt) {
      throw new Error('Consent has already been signed for this session.');
    }

    // Write the consent signature
    await db.update(schema.tattooSession)
      .set({
        consentSigned: true,
        consentSignedAt: new Date(),
        consentSignedBy: validated.signedName,
      })
      .where(eq(schema.tattooSession.id, validated.sessionId));

    // Audit logging for portal consent signing
    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'consent',
        resourceId: validated.sessionId,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { signedName: validated.signedName },
      })
    );

    revalidatePath('/portal/tattoos');
  });
}

/**
 * Update the authenticated user's customer profile.
 * Only allows non-medical fields per D-04.
 */
export async function updateProfileAction(formData: FormData): Promise<ActionResult<void>> {
  const session = await requireRole('user');

  return safeAction(async () => {
    const validated = UpdatePortalProfileSchema.parse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone') || undefined,
      address: formData.get('address') || undefined,
      city: formData.get('city') || undefined,
      state: formData.get('state') || undefined,
      postalCode: formData.get('postalCode') || undefined,
      country: formData.get('country') || undefined,
    });

    // Find customer by userId -- ownership guaranteed by session
    const customer = await db.query.customer.findFirst({
      where: eq(schema.customer.userId, session.user.id),
    });

    if (!customer) {
      throw new Error('No linked customer account found.');
    }

    // Update only allowed fields
    await db.update(schema.customer)
      .set(validated)
      .where(eq(schema.customer.id, customer.id));

    // Audit logging for portal profile update
    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'customer_profile',
        resourceId: customer.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/portal');
  });
}
