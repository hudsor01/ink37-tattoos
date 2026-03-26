'use server';

import { createMediaItem, updateMediaItem, deleteMediaItem, togglePublicVisibility } from '@/lib/dal/media';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createMediaAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

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
  return result;
}

export async function updateMediaAction(id: string, formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

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
  return result;
}

export async function deleteMediaAction(id: string) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

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
}

export async function toggleVisibilityAction(id: string, isPublic: boolean) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

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
  return result;
}
