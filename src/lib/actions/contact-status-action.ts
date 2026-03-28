'use server';

import { updateContactStatus } from '@/lib/dal/contacts';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function updateContactStatusAction(id: string, status: 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED'): Promise<ActionResult<void>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    await updateContactStatus(id, status);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'contact',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { status },
      })
    );

    revalidatePath('/dashboard/contacts');
  });
}
