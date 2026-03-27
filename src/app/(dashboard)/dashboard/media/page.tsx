import { connection } from 'next/server';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getMediaItems } from '@/lib/dal/media';
import { MediaPageClient } from './media-page-client';

export default async function MediaPage() {
  await connection();
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } });
  await queryClient.prefetchQuery({
    queryKey: ['media'],
    queryFn: () => getMediaItems(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Media Management</h1>
        <p className="text-muted-foreground">
          Upload and manage your portfolio photos and videos.
        </p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MediaPageClient />
      </HydrationBoundary>
    </div>
  );
}
