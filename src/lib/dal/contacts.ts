import 'server-only';
import { db } from '@/lib/db';
import type { ContactStatus } from '@/generated/prisma/client';

export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  return db.contact.create({ data });
}

// Admin-only functions -- caller must use requireStaffRole before invoking
export async function getContacts(filters?: {
  status?: ContactStatus;
  limit?: number;
  offset?: number;
}) {
  return db.contact.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
    skip: filters?.offset ?? 0,
  });
}

export async function getContactById(id: string) {
  return db.contact.findUnique({ where: { id } });
}

export async function updateContactStatus(
  id: string,
  status: ContactStatus,
  adminNotes?: string
) {
  return db.contact.update({
    where: { id },
    data: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
  });
}
