'use server';

import { CreateAppointmentSchema, UpdateAppointmentSchema } from '@/lib/security/validation';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createAppointmentAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const validated = CreateAppointmentSchema.parse(raw);
    const result = await createAppointment(validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'appointment',
        resourceId: result.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/appointments');
    return { id: result.id };
  });
}

export async function updateAppointmentAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const validated = UpdateAppointmentSchema.parse(raw);
    const result = await updateAppointment(id, validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'appointment',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/appointments');
    return { id: result.id };
  });
}

export async function deleteAppointmentAction(id: string): Promise<ActionResult<void>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    await deleteAppointment(id);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'appointment',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
      })
    );

    revalidatePath('/dashboard/appointments');
  });
}
