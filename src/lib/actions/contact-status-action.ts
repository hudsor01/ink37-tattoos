'use server';

import { updateContactStatus } from '@/lib/dal/contacts';
import { revalidatePath } from 'next/cache';

export async function updateContactStatusAction(id: string, status: 'NEW' | 'READ' | 'REPLIED' | 'RESOLVED') {
  await updateContactStatus(id, status);
  revalidatePath('/dashboard/contacts');
  return { success: true };
}
