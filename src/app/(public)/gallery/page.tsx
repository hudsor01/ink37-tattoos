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

// Mirror the GalleryClient masonry layout (columns-1 md:columns-2 lg:columns-3
// with break-inside-avoid items at varying aspect ratios) so the swap-in
// doesn't cause a grid-to-masonry reflow on slow connections.
function GallerySkeleton() {
  const heights = ['h-64', 'h-48', 'h-72', 'h-56', 'h-80', 'h-44', 'h-60', 'h-52', 'h-68'];
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-3">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`break-inside-avoid mb-3 ${h} animate-pulse rounded-lg bg-muted`}
        />
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
