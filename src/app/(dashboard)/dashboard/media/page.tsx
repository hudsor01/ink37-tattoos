import { connection } from 'next/server';
import { getMediaItems } from '@/lib/dal/media';
import { MediaPageClient } from './media-page-client';

export default async function MediaPage() {
  await connection();
  const media = await getMediaItems();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Media Management</h1>
        <p className="text-muted-foreground">
          Upload and manage your portfolio photos and videos.
        </p>
      </div>
      <MediaPageClient initialMedia={JSON.parse(JSON.stringify(media))} />
    </div>
  );
}
