import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { getPublicDesigns } from '@/lib/dal/designs';
import { GalleryClient } from '@/components/public/gallery-grid';
import { BreadcrumbNav } from '@/components/public/breadcrumb-nav';


export const metadata: Metadata = {
  title: 'Gallery | Ink 37 Tattoos',
  description:
    'Browse our portfolio of custom tattoo art. Filter by style, placement, and size.',
  openGraph: {
    title: 'Gallery | Ink 37 Tattoos',
    description: 'Browse our portfolio of custom tattoo art.',
  },
};

async function Designs() {
  await connection();
  const designs = await getPublicDesigns();
  return <GalleryClient initialDesigns={designs} />;
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <>
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Gallery' },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">Gallery</h1>
        <p className="text-muted-foreground mb-8">
          Browse our portfolio of custom tattoo art
        </p>
        <Suspense fallback={<GallerySkeleton />}>
          <Designs />
        </Suspense>
      </div>
    </>
  );
}
