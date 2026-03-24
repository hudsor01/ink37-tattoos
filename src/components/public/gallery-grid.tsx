'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { GalleryFilterBar } from '@/components/public/gallery-filter-bar';
import { GalleryLightbox } from '@/components/public/gallery-lightbox';

interface Design {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  size: string | null;
  style: string | null;
  tags: string[] | null;
  popularity: number;
  createdAt: Date;
}

interface GalleryClientProps {
  initialDesigns: Design[];
}

function GalleryClientInner({ initialDesigns }: GalleryClientProps) {
  const searchParams = useSearchParams();
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);

  const activeFilters = {
    style: searchParams.get('style') ?? undefined,
    placement: searchParams.get('placement') ?? undefined,
    size: searchParams.get('size') ?? undefined,
  };

  const filteredDesigns = useMemo(() => {
    return initialDesigns.filter((design) => {
      // Style filter: matches designType or style field
      if (activeFilters.style) {
        const styleMatch =
          design.designType?.toLowerCase() === activeFilters.style.toLowerCase() ||
          design.style?.toLowerCase() === activeFilters.style.toLowerCase();
        if (!styleMatch) return false;
      }

      // Placement filter: checks tags array
      if (activeFilters.placement) {
        const placementMatch = (design.tags ?? []).some(
          (tag) => tag.toLowerCase() === activeFilters.placement!.toLowerCase()
        );
        if (!placementMatch) return false;
      }

      // Size filter: matches size field
      if (activeFilters.size) {
        const sizeMatch =
          design.size?.toLowerCase() === activeFilters.size.toLowerCase();
        if (!sizeMatch) return false;
      }

      return true;
    });
  }, [initialDesigns, activeFilters.style, activeFilters.placement, activeFilters.size]);

  // Empty state: no designs at all
  if (initialDesigns.length === 0) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-semibold mb-2">Gallery Coming Soon</h2>
        <p className="text-muted-foreground">
          We&apos;re curating our portfolio. Check back soon or book a consultation to
          discuss your idea.
        </p>
      </div>
    );
  }

  return (
    <>
      <GalleryFilterBar activeFilters={activeFilters} />

      {filteredDesigns.length === 0 ? (
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold mb-2">No designs match your filters</h2>
          <p className="text-muted-foreground">
            Try adjusting your filter criteria to see more work.
          </p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-3">
          {filteredDesigns.map((design, index) => (
            <div
              key={design.id}
              className="break-inside-avoid mb-3 cursor-pointer group"
              onClick={() => setLightboxIndex(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLightboxIndex(index);
                }
              }}
            >
              <div className="relative overflow-hidden rounded-lg transition-transform duration-200 ease-out group-hover:scale-[1.02]">
                <Image
                  src={design.thumbnailUrl ?? design.fileUrl}
                  alt={design.name}
                  width={400}
                  height={0}
                  style={{ height: 'auto' }}
                  className="w-full"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      <GalleryLightbox
        designs={filteredDesigns}
        currentIndex={lightboxIndex}
        open={lightboxIndex >= 0}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(-1);
        }}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}

export function GalleryClient({ initialDesigns }: GalleryClientProps) {
  return (
    <Suspense fallback={null}>
      <GalleryClientInner initialDesigns={initialDesigns} />
    </Suspense>
  );
}
