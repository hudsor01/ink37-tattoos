'use server';

import { CreateAppointmentSchema, UpdateAppointmentSchema } from '@/lib/security/validation';
import { createAppointment, updateAppointment, deleteAppointment, checkSchedulingConflict } from '@/lib/dal/appointments';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createAppointmentAction(
  formData: FormData,
  options?: { forceOverride?: boolean }
) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const raw = Object.fromEntries(formData);
  const validated = CreateAppointmentSchema.parse(raw);

  // Check for scheduling conflicts unless override is requested
  if (!options?.forceOverride && validated.scheduledDate) {
    const proposedDate = new Date(validated.scheduledDate);
    const durationHours = validated.duration ? validated.duration / 60 : 2;
    const hasConflict = await checkSchedulingConflict(proposedDate, durationHours);
    if (hasConflict) {
      return { success: false, error: 'SCHEDULING_CONFLICT' } as const;
    }
  }

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
  return { success: true, data: result } as const;
}

export async function updateAppointmentAction(
  id: string,
  formData: FormData,
  options?: { forceOverride?: boolean }
) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const raw = Object.fromEntries(formData);
  const validated = UpdateAppointmentSchema.parse(raw);

  // Check for scheduling conflicts on date changes unless override is requested
  if (!options?.forceOverride && validated.scheduledDate) {
    const proposedDate = new Date(validated.scheduledDate);
    const durationHours = validated.duration ? validated.duration / 60 : 2;
    const hasConflict = await checkSchedulingConflict(proposedDate, durationHours);
    if (hasConflict) {
      return { success: false, error: 'SCHEDULING_CONFLICT' } as const;
    }
  }

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
  return { success: true, data: result } as const;
}

export async function deleteAppointmentAction(id: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

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
}
