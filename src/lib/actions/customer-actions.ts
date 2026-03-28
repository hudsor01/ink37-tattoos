'use server';

import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/security/validation';
import { createCustomer, updateCustomer, deleteCustomer } from '@/lib/dal/customers';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createCustomerAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    // Handle array fields
    const data = {
      ...raw,
      allergies: formData.getAll('allergies').map(String).filter(Boolean),
      medicalConditions: formData.getAll('medicalConditions').map(String).filter(Boolean),
    };
    const validated = CreateCustomerSchema.parse(data);
    const result = await createCustomer(validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'customer',
        resourceId: result.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/customers');
    return { id: result.id };
  });
}

export async function updateCustomerAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const data = {
      ...raw,
      allergies: formData.getAll('allergies').map(String).filter(Boolean),
      medicalConditions: formData.getAll('medicalConditions').map(String).filter(Boolean),
    };
    const validated = UpdateCustomerSchema.parse(data);
    const result = await updateCustomer(id, validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'customer',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/customers');
    return { id: result.id };
  });
}

export async function deleteCustomerAction(id: string): Promise<ActionResult<void>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    await deleteCustomer(id);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'customer',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
      })
    );

    revalidatePath('/dashboard/customers');
  });
}
