'use client';

import { useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Design {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  designType: string | null;
  size: string | null;
  style: string | null;
  tags: string[];
}

interface GalleryLightboxProps {
  designs: Design[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

export function GalleryLightbox({
  designs,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: GalleryLightboxProps) {
  const design = designs[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < designs.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback: do nothing if clipboard API not available
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goToPrev, goToNext]);

  if (!design) return null;

  const tags: string[] = [];
  if (design.designType) tags.push(design.designType);
  if (design.style && design.style !== design.designType) tags.push(design.style);
  if (design.size) tags.push(design.size);
  if (design.tags?.length) {
    design.tags.forEach((tag) => {
      if (!tags.includes(tag)) tags.push(tag);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-4xl p-0 overflow-hidden">
        <div className="sr-only">
          <DialogTitle>{design.name}</DialogTitle>
          <DialogDescription>
            {design.description ?? `View of ${design.name}`}
          </DialogDescription>
        </div>

        <div className="relative flex items-center justify-center bg-black/5 min-h-[50vh] max-h-[80vh]">
          <Image
            src={design.fileUrl}
            alt={design.name}
            width={800}
            height={600}
            className="object-contain max-h-[80vh] w-auto"
            priority
          />

          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-6" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              aria-label="Next image"
            >
              <ChevronRight className="size-6" />
            </Button>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">{design.name}</h3>
              {design.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {design.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleShare}
              aria-label="Share"
            >
              <Share2 className="size-4" />
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {currentIndex + 1} of {designs.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
