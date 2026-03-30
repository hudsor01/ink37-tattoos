'use server';

import { CreateSessionSchema, type CreateSessionData } from '@/lib/security/validation';
import { createSession, updateSession, deleteSession, getSessionById, getSessionWithDetails } from '@/lib/dal/sessions';
import { getSettingByKey } from '@/lib/dal/settings';
import { logAudit } from '@/lib/dal/audit';
import { requireRole, getCurrentSession } from '@/lib/auth';
import { sendAftercareEmail } from '@/lib/email/resend';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createSessionAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const data = {
      ...raw,
      duration: Number(raw.duration),
      hourlyRate: Number(raw.hourlyRate),
      estimatedHours: Number(raw.estimatedHours),
      depositAmount: raw.depositAmount ? Number(raw.depositAmount) : 0,
      totalCost: Number(raw.totalCost),
    };
    const validated = CreateSessionSchema.parse(data);
    const result = await createSession(validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'session',
        resourceId: result.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/sessions');
    return { id: result.id };
  });
}

export async function updateSessionAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const data: Record<string, unknown> = { ...raw };
    if (raw.duration) data.duration = Number(raw.duration);
    if (raw.hourlyRate) data.hourlyRate = Number(raw.hourlyRate);
    if (raw.estimatedHours) data.estimatedHours = Number(raw.estimatedHours);
    if (raw.depositAmount) data.depositAmount = Number(raw.depositAmount);
    if (raw.totalCost) data.totalCost = Number(raw.totalCost);

    const result = await updateSession(id, data as Partial<CreateSessionData>);

    // Aftercare email trigger (BIZ-03, per D-05)
    // Send aftercare email when session status changes to COMPLETED
    if (data.status === 'COMPLETED') {
      const sessionData = await getSessionWithDetails(id);
      if (sessionData && !sessionData.aftercareProvided && sessionData.customer?.email) {
        // Fetch configurable template from settings
        const aftercareSettingRaw = await getSettingByKey('aftercare_template');
        const aftercareTemplate = typeof aftercareSettingRaw?.value === 'string'
          ? aftercareSettingRaw.value
          : undefined;

        after(async () => {
          try {
            await sendAftercareEmail({
              to: sessionData.customer!.email!,
              customerName: `${sessionData.customer!.firstName} ${sessionData.customer!.lastName}`,
              sessionDate: format(sessionData.appointmentDate, 'MMMM d, yyyy'),
              placement: sessionData.placement,
              template: aftercareTemplate,
            });
            // Mark aftercareProvided to prevent re-sends
            await db.update(schema.tattooSession)
              .set({ aftercareProvided: true })
              .where(eq(schema.tattooSession.id, id));
          } catch (err) {
            console.error('[Aftercare] Email failed:', err);
          }
        });
      }
    }

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'session',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: data },
      })
    );

    revalidatePath('/dashboard/sessions');
    return { id: result.id };
  });
}

export async function deleteSessionAction(id: string): Promise<ActionResult<void>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    await deleteSession(id);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'session',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
      })
    );

    revalidatePath('/dashboard/sessions');
  });
}

const ALLOWED_INLINE_FIELDS = [
  'designDescription',
  'placement',
  'size',
  'style',
  'notes',
  'duration',
  'hourlyRate',
  'estimatedHours',
  'status',
] as const;

type InlineField = (typeof ALLOWED_INLINE_FIELDS)[number];

const NUMBER_FIELDS: InlineField[] = ['duration', 'hourlyRate', 'estimatedHours'];

export async function updateSessionFieldAction(
  id: string,
  field: string,
  value: string
) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  if (!ALLOWED_INLINE_FIELDS.includes(field as InlineField)) {
    return { success: false, error: `Field "${field}" is not editable` } as const;
  }

  const coercedValue = NUMBER_FIELDS.includes(field as InlineField)
    ? Number(value)
    : value;

  if (NUMBER_FIELDS.includes(field as InlineField) && isNaN(coercedValue as number)) {
    return { success: false, error: `Invalid number for field "${field}"` } as const;
  }

  const result = await updateSession(id, {
    [field]: coercedValue,
  } as Partial<CreateSessionData>);

  // Aftercare email trigger for inline status edit to COMPLETED (BIZ-03)
  if (field === 'status' && value === 'COMPLETED') {
    const sessionData = await getSessionWithDetails(id);
    if (sessionData && !sessionData.aftercareProvided && sessionData.customer?.email) {
      const aftercareSettingRaw = await getSettingByKey('aftercare_template');
      const aftercareTemplate = typeof aftercareSettingRaw?.value === 'string'
        ? aftercareSettingRaw.value
        : undefined;

      after(async () => {
        try {
          await sendAftercareEmail({
            to: sessionData.customer!.email!,
            customerName: `${sessionData.customer!.firstName} ${sessionData.customer!.lastName}`,
            sessionDate: format(sessionData.appointmentDate, 'MMMM d, yyyy'),
            placement: sessionData.placement,
            template: aftercareTemplate,
          });
          await db.update(schema.tattooSession)
            .set({ aftercareProvided: true })
            .where(eq(schema.tattooSession.id, id));
        } catch (err) {
          console.error('[Aftercare] Email failed:', err);
        }
      });
    }
  }

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'INLINE_EDIT',
      resource: 'session',
      resourceId: id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { field, newValue: value },
    })
  );

  revalidatePath(`/dashboard/sessions/${id}`);
  return { success: true, data: result } as const;
}

export async function addSessionImageAction(id: string, imageUrl: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const existing = await getSessionById(id);
  if (!existing) {
    return { success: false, error: 'Session not found' } as const;
  }

  const updatedImages = [...(existing.referenceImages ?? []), imageUrl];
  const result = await updateSession(id, {
    referenceImages: updatedImages,
  } as Partial<CreateSessionData>);

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'ADD_IMAGE',
      resource: 'session',
      resourceId: id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { imageUrl },
    })
  );

  revalidatePath(`/dashboard/sessions/${id}`);
  return { success: true, data: result } as const;
}

export async function removeSessionImageAction(id: string, imageUrl: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const existing = await getSessionById(id);
  if (!existing) {
    return { success: false, error: 'Session not found' } as const;
  }

  const updatedImages = (existing.referenceImages ?? []).filter(
    (img) => img !== imageUrl
  );
  await updateSession(id, {
    referenceImages: updatedImages,
  } as Partial<CreateSessionData>);

  // Delete blob from Vercel Blob storage to prevent orphanage
  try {
    await del(imageUrl);
  } catch (err) {
    // Log but don't fail -- DB record is already updated
    console.error(
      `[Session] Failed to delete blob for session ${id}:`,
      err instanceof Error ? err.message : err
    );
  }

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'REMOVE_IMAGE',
      resource: 'session',
      resourceId: id,
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { imageUrl },
    })
  );

  revalidatePath(`/dashboard/sessions/${id}`);
  return { success: true } as const;
}
