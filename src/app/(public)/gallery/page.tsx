import type { Metadata } from 'next';
import { GALLERY_DESIGNS } from '@/lib/gallery-designs';
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
        <GalleryClient initialDesigns={GALLERY_DESIGNS} />
      </div>
    </>
  );
}
