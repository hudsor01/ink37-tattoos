'use server';

import { updateContactStatus } from '@/lib/dal/contacts';
import { requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateContactStatusAction(id: string, status: 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED') {
  await requireRole('admin');

  await updateContactStatus(id, status);
  revalidatePath('/dashboard/contacts');
  return { success: true };
}
