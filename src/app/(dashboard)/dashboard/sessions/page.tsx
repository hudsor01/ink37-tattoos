import { connection } from 'next/server';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getSessions } from '@/lib/dal/sessions';
import { SessionListClient } from './session-list-client';

export default async function SessionsPage() {
  await connection();
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  await queryClient.prefetchQuery({
    queryKey: ['sessions'],
    queryFn: () => getSessions(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Session Tracking</h1>
        <p className="text-muted-foreground">
          Manage tattoo sessions, pricing, and consent tracking.
        </p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SessionListClient />
      </HydrationBoundary>
    </div>
  );
}
