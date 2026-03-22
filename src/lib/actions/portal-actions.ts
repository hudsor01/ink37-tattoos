'use server';

import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { ConsentSignSchema, UpdatePortalProfileSchema } from '@/lib/security/validation';
import { revalidatePath } from 'next/cache';

/**
 * Sign consent for a tattoo session.
 * Validates input, verifies ownership (IDOR protection), prevents re-signing (D-10).
 */
export async function signConsentAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return { success: false, error: 'You must be logged in to sign consent.' };
  }

  // Parse and validate input
  const parseResult = ConsentSignSchema.safeParse({
    sessionId: formData.get('sessionId'),
    signedName: formData.get('signedName'),
    acknowledged: formData.get('acknowledged') === 'true',
  });

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: firstError };
  }

  const validated = parseResult.data;

  // Verify the user has a linked Customer record
  const customer = await db.customer.findUnique({
    where: { userId: session.user.id },
  });

  if (!customer) {
    return { success: false, error: 'No linked customer account found.' };
  }

  // Find the tattoo session -- ownership check via customerId prevents IDOR
  const tattooSession = await db.tattooSession.findFirst({
    where: {
      id: validated.sessionId,
      customerId: customer.id,
    },
  });

  if (!tattooSession) {
    return { success: false, error: 'Tattoo session not found.' };
  }

  // D-10: Cannot re-sign if already signed
  if (tattooSession.consentSignedAt) {
    return { success: false, error: 'Consent has already been signed for this session.' };
  }

  // Write the consent signature
  await db.tattooSession.update({
    where: { id: validated.sessionId },
    data: {
      consentSigned: true,
      consentSignedAt: new Date(),
      consentSignedBy: validated.signedName,
    },
  });

  revalidatePath('/portal/tattoos');
  return { success: true };
}

/**
 * Update the authenticated user's customer profile.
 * Only allows non-medical fields per D-04.
 */
export async function updateProfileAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return { success: false, error: 'You must be logged in to update your profile.' };
  }

  // Parse and validate input
  const parseResult = UpdatePortalProfileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    postalCode: formData.get('postalCode') || undefined,
    country: formData.get('country') || undefined,
  });

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: firstError };
  }

  const validated = parseResult.data;

  // Find customer by userId -- ownership guaranteed by session
  const customer = await db.customer.findUnique({
    where: { userId: session.user.id },
  });

  if (!customer) {
    return { success: false, error: 'No linked customer account found.' };
  }

  // Update only allowed fields
  await db.customer.update({
    where: { id: customer.id },
    data: validated,
  });

  revalidatePath('/portal');
  return { success: true };
}
