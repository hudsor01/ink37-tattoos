'use server';

import { CreateAppointmentSchema, UpdateAppointmentSchema } from '@/lib/security/validation';
import { createAppointment, updateAppointment, deleteAppointment } from '@/lib/dal/appointments';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createAppointmentAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const raw = Object.fromEntries(formData);
  const validated = CreateAppointmentSchema.parse(raw);
  const result = await createAppointment(validated);

  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'CREATE',
    resource: 'appointment',
    resourceId: result.id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { changes: validated },
  }).catch(() => {});

  revalidatePath('/dashboard/appointments');
  return result;
}

export async function updateAppointmentAction(id: string, formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const raw = Object.fromEntries(formData);
  const validated = UpdateAppointmentSchema.parse(raw);
  const result = await updateAppointment(id, validated);

  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'UPDATE',
    resource: 'appointment',
    resourceId: id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { changes: validated },
  }).catch(() => {});

  revalidatePath('/dashboard/appointments');
  return result;
}

export async function deleteAppointmentAction(id: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  await deleteAppointment(id);

  const hdrs = await headers();
  logAudit({
    userId: session.user.id,
    action: 'DELETE',
    resource: 'appointment',
    resourceId: id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
  }).catch(() => {});

  revalidatePath('/dashboard/appointments');
}
