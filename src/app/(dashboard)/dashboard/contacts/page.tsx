import { connection } from 'next/server';
import { getContacts } from '@/lib/dal/contacts';
import { ContactsClient } from './contacts-client';

interface ContactsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  await connection();

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || '';
  const status = params.status || '';

  const result = await getContacts({
    page: isNaN(page) ? 1 : page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
  });

  const serialized = {
    ...result,
    data: result.data.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contact Submissions</h1>
        <p className="text-muted-foreground">
          Messages from the public contact form.
        </p>
      </div>
      <ContactsClient
        initialData={serialized}
        searchQuery={search}
        statusFilter={status}
      />
    </div>
  );
}
