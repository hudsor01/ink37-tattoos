import { connection } from 'next/server';
import { getContacts } from '@/lib/dal/contacts';
import { ContactsClient } from './contacts-client';

export default async function ContactsPage() {
  await connection();
  const contacts = await getContacts();
  const serialized = contacts.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contact Submissions</h1>
        <p className="text-muted-foreground">
          Messages from the public contact form.
        </p>
      </div>
      <ContactsClient contacts={serialized} />
    </div>
  );
}
