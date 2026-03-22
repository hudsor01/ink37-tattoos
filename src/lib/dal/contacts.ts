import 'server-only';
import { db } from '@/lib/db';

export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  return db.contact.create({ data });
}
