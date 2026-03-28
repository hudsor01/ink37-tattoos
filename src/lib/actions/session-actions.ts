'use server';

import { CreateSessionSchema, type CreateSessionData } from '@/lib/security/validation';
import { createSession, updateSession, deleteSession } from '@/lib/dal/sessions';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

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
