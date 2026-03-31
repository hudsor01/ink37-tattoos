'use server';

import {
  createMediaItem,
  updateMediaItem,
  deleteMediaItem,
  getMediaItemById,
  togglePublicVisibility,
  bulkUpdateTags,
  toggleMediaApproval,
} from '@/lib/dal/media';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import { logger } from '@/lib/logger';

export async function createMediaAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const data = {
      name: formData.get('name') as string,
      fileUrl: formData.get('fileUrl') as string,
      thumbnailUrl: (formData.get('thumbnailUrl') as string) || undefined,
      designType: (formData.get('designType') as string) || undefined,
      size: (formData.get('size') as string) || undefined,
      style: (formData.get('style') as string) || undefined,
      tags: formData.getAll('tags').map(String).filter(Boolean),
      artistId: formData.get('artistId') as string,
      customerId: (formData.get('customerId') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
    };

    const result = await createMediaItem(data);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'media',
        resourceId: result.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: data },
      })
    );

    revalidatePath('/dashboard/media');
    return { id: result.id };
  });
}

export async function updateMediaAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const data: Record<string, unknown> = {};
    const name = formData.get('name');
    if (name) data.name = name as string;
    const description = formData.get('description');
    if (description) data.description = description as string;
    const designType = formData.get('designType');
    if (designType) data.designType = designType as string;
    const size = formData.get('size');
    if (size) data.size = size as string;
    const style = formData.get('style');
    if (style) data.style = style as string;
    const tags = formData.getAll('tags');
    if (tags.length) data.tags = tags.map(String);

    const result = await updateMediaItem(id, data);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'media',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: data },
      })
    );

    revalidatePath('/dashboard/media');
    return { id: result.id };
  });
}

export async function deleteMediaAction(id: string): Promise<ActionResult<void>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    // Fetch media record to get blob URL before deleting from DB
    const media = await getMediaItemById(id);
    if (media?.fileUrl) {
      try {
        await del(media.fileUrl);
        if (media.thumbnailUrl) await del(media.thumbnailUrl);
      } catch (err) {
        // Log but don't block deletion if blob cleanup fails
        logger.error({ err, mediaId: id }, 'Failed to delete blob for media');
      }
    }

    await deleteMediaItem(id);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'media',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
      })
    );

    revalidatePath('/dashboard/media');
  });
}

export async function toggleVisibilityAction(id: string, isPublic: boolean): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const result = await togglePublicVisibility(id, isPublic);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'media',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { isPublic },
      })
    );

    revalidatePath('/dashboard/media');
    return { id: result.id };
  });
}

export async function bulkUploadMediaAction(
  files: { name: string; fileUrl: string; thumbnailUrl?: string }[],
  tags: string[],
  artistId: string
): Promise<ActionResult<{ count: number }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    let successCount = 0;
    for (const file of files) {
      await createMediaItem({
        name: file.name,
        fileUrl: file.fileUrl,
        thumbnailUrl: file.thumbnailUrl,
        tags,
        artistId,
      });
      successCount++;
    }

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'media',
        resourceId: 'bulk',
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { count: successCount, tags },
      })
    );

    revalidatePath('/dashboard/media');
    return { count: successCount };
  });
}

export async function bulkAssignTagsAction(
  ids: string[],
  tags: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const results = await bulkUpdateTags(ids, tags);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'media',
        resourceId: 'bulk',
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { ids, tags },
      })
    );

    revalidatePath('/dashboard/media');
    return { count: results.length };
  });
}

export async function toggleMediaApprovalAction(
  id: string,
  isApproved: boolean
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const result = await toggleMediaApproval(id, isApproved);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'media',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { isApproved },
      })
    );

    revalidatePath('/dashboard/media');
    return { id: result.id };
  });
}

export async function toggleMediaVisibilityAction(
  id: string,
  isPublic: boolean
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const result = await updateMediaItem(id, { isPublic });

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'media',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { isPublic },
      })
    );

    revalidatePath('/dashboard/media');
    return { id: result.id };
  });
}
