'use server';

import { z } from 'zod';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/security/validation';
import { createCustomer, updateCustomer, deleteCustomer, checkDuplicateEmails } from '@/lib/dal/customers';
import { logAudit } from '@/lib/dal/audit';
import { requireRole, getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

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

// ============================================================================
// BULK ACTIONS
// ============================================================================

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export async function bulkDeleteCustomersAction(
  ids: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = bulkDeleteSchema.safeParse({ ids });
  if (!validated.success) {
    return { success: false, error: 'Invalid customer IDs provided' };
  }

  const deleted = await db
    .delete(schema.customer)
    .where(inArray(schema.customer.id, validated.data.ids))
    .returning({ id: schema.customer.id });

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'BULK_DELETE',
      resource: 'customer',
      resourceId: 'bulk',
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: {
        deletedIds: deleted.map((d) => d.id),
        count: deleted.length,
      },
    })
  );

  revalidatePath('/dashboard/customers');
  return { success: true, data: { deletedCount: deleted.length } };
}

const csvRowSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  phone: z.string().optional(),
});

const importSchema = z.object({
  customers: z.array(csvRowSchema),
});

export async function importCustomersAction(
  customers: { firstName: string; lastName: string; email?: string; phone?: string }[]
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = importSchema.safeParse({ customers });
  if (!validated.success) {
    return {
      success: false,
      error: 'Validation failed for one or more rows',
      fieldErrors: Object.fromEntries(
        validated.error.issues.map((i) => [i.path.join('.'), [i.message]])
      ),
    };
  }

  let imported = 0;
  let skipped = 0;

  for (const customer of validated.data.customers) {
    try {
      await db.insert(schema.customer).values({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email && customer.email !== '' ? customer.email : null,
        phone: customer.phone || null,
      });
      imported++;
    } catch (err: unknown) {
      // Re-throw framework signals so a deeper redirect()/notFound()
      // /unauthorized()/forbidden() doesn't get masked as a skipped row.
      if (isFrameworkSignal(err)) throw err;
      // Skip the row regardless of cause -- the previous if/else branches
      // both incremented `skipped` so the unique-constraint check was
      // dead code. If we ever need to differentiate "skipped because
      // duplicate" vs "skipped because of error", split the counter
      // into two fields and update the response shape.
      skipped++;
    }
  }

  const hdrs = await headers();
  after(() =>
    logAudit({
      userId: session.user.id,
      action: 'IMPORT',
      resource: 'customer',
      resourceId: 'bulk',
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { imported, skipped },
    })
  );

  revalidatePath('/dashboard/customers');
  return { success: true, data: { imported, skipped } };
}

export async function checkDuplicateEmailsAction(
  emails: string[]
): Promise<ActionResult<string[]>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validEmails = emails.filter((e) => e && e.includes('@'));
  if (validEmails.length === 0) {
    return { success: true, data: [] };
  }

  const duplicates = await checkDuplicateEmails(validEmails);
  return { success: true, data: duplicates };
}
