'use server';

import { ConsentFormSchema } from '@/lib/security/validation';
import { createConsentFormVersion } from '@/lib/dal/consent';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function createConsentFormVersionAction(formData: FormData) {
  const session = await requireRole('admin');

  const raw = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
  };

  const validated = ConsentFormSchema.parse(raw);
  const result = await createConsentFormVersion(validated);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'CREATE',
      resource: 'consent_form',
      resourceId: result.id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { version: result.version, title: validated.title },
    })
  );

  revalidatePath('/dashboard/consent');
  return result;
}

export async function deactivateConsentFormAction(id: string) {
  const session = await requireRole('admin');

  const [result] = await db
    .update(schema.consentForm)
    .set({ isActive: false })
    .where(eq(schema.consentForm.id, id))
    .returning();

  if (!result) {
    throw new Error('Consent form not found');
  }

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'DEACTIVATE',
      resource: 'consent_form',
      resourceId: id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
    })
  );

  revalidatePath('/dashboard/consent');
  return result;
}
