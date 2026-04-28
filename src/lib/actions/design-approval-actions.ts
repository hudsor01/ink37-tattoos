'use server';

import { updateDesignApprovalStatus } from '@/lib/dal/designs';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath, updateTag } from 'next/cache';

export async function approveDesignAction(
  designId: string
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const result = await updateDesignApprovalStatus(designId, true);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DESIGN_APPROVED',
        resource: 'tattoo_design',
        resourceId: designId,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { designName: result.name },
      })
    );

    revalidatePath('/dashboard/designs');
    // Public gallery reads are cached via cacheTag('public-designs').
    updateTag('public-designs');
    updateTag(`design:${designId}`);
    return { id: result.id };
  });
}

export async function rejectDesignAction(
  designId: string,
  notes: string
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const result = await updateDesignApprovalStatus(designId, false, notes);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DESIGN_REJECTED',
        resource: 'tattoo_design',
        resourceId: designId,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { designName: result.name, rejectionNotes: notes },
      })
    );

    revalidatePath('/dashboard/designs');
    updateTag('public-designs');
    updateTag(`design:${designId}`);
    return { id: result.id };
  });
}
