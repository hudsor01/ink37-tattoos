import { connection } from 'next/server';
import { getCustomers } from '@/lib/dal/customers';
import { CustomerListClient } from './customer-list-client';

export default async function CustomersPage() {
  await connection();
  const customers = await getCustomers();

  // Serialize dates for client component
  const serialized = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  return <CustomerListClient initialCustomers={serialized} />;
}
