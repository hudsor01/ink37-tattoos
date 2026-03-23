import 'server-only';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const [result] = await db.insert(schema.contact).values(data).returning();
  return result;
}
