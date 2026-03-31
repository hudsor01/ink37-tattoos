'use client';

import { useState } from 'react';

interface GalleryVideoCardProps {
  name: string;
  url: string;
  posterUrl: string;
}

export function GalleryVideoCard({ name, url, posterUrl }: GalleryVideoCardProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="break-inside-avoid mb-3">
        <div className="relative overflow-hidden rounded-lg bg-muted flex items-center justify-center aspect-video">
          <p className="text-sm text-muted-foreground">Video unavailable</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground truncate">{name}</p>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid mb-3 group">
      <div className="relative overflow-hidden rounded-lg transition-transform duration-200 ease-out group-hover:scale-[1.02]">
        <video
          src={url}
          poster={posterUrl}
          className="w-full"
          controls
          preload="metadata"
          playsInline
          muted
          aria-label={name}
          onError={() => setHasError(true)}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground truncate">{name}</p>
    </div>
  );
}
