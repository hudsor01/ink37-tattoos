'use client';

import { useMemo, useState } from 'react';
import { useQueryStates } from 'nuqs';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { GalleryFilterBar, galleryFilterParsers } from '@/components/public/gallery-filter-bar';
import dynamic from 'next/dynamic';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const GalleryLightbox = dynamic(() => import('@/components/public/gallery-lightbox').then(m => m.GalleryLightbox));

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

export function GalleryClient({ initialDesigns }: GalleryClientProps) {
  const [filters] = useQueryStates(galleryFilterParsers);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);

  const filteredDesigns = useMemo(() => {
    return initialDesigns.filter((design) => {
      // Style filter: matches designType or style field
      if (filters.style) {
        const styleMatch =
          design.designType?.toLowerCase() === filters.style.toLowerCase() ||
          design.style?.toLowerCase() === filters.style.toLowerCase();
        if (!styleMatch) return false;
      }

      // Placement filter: checks tags array
      if (filters.placement) {
        const placementMatch = (design.tags ?? []).some(
          (tag) => tag.toLowerCase() === filters.placement!.toLowerCase()
        );
        if (!placementMatch) return false;
      }

      // Size filter: matches size field
      if (filters.size) {
        const sizeMatch =
          design.size?.toLowerCase() === filters.size.toLowerCase();
        if (!sizeMatch) return false;
      }

      return true;
    });
  }, [initialDesigns, filters.style, filters.placement, filters.size]);

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
      <GalleryFilterBar />

      {filteredDesigns.length === 0 ? (
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold mb-2">No designs match your filters</h2>
          <p className="text-muted-foreground">
            Try adjusting your filter criteria to see more work.
          </p>
        </div>
      ) : (
        <motion.div
          className="columns-1 md:columns-2 lg:columns-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={`${filters.style}-${filters.placement}-${filters.size}`}
        >
          {filteredDesigns.map((design, index) => (
            <motion.div
              key={design.id}
              variants={itemVariants}
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
            </motion.div>
          ))}
        </motion.div>
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
