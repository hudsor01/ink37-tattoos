import { connection } from 'next/server';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getCustomers } from '@/lib/dal/customers';
import { CustomerListClient } from './customer-list-client';

export default async function CustomersPage() {
  await connection();
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  await queryClient.prefetchQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CustomerListClient />
    </HydrationBoundary>
  );
}
