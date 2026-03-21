'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const FILTER_GROUPS = {
  style: {
    label: 'Style',
    options: [
      'Traditional',
      'Neo-Traditional',
      'Realism',
      'Blackwork',
      'Illustrative',
      'Watercolor',
      'Geometric',
      'Japanese',
      'Lettering',
      'Minimalist',
    ],
  },
  placement: {
    label: 'Placement',
    options: ['Arm', 'Leg', 'Back', 'Chest', 'Shoulder', 'Ribs', 'Hand', 'Neck', 'Other'],
  },
  size: {
    label: 'Size',
    options: ['Small', 'Medium', 'Large', 'Extra Large'],
  },
} as const;

type FilterGroup = keyof typeof FILTER_GROUPS;

interface GalleryFilterBarProps {
  activeFilters: Record<string, string | undefined>;
}

export function GalleryFilterBar({ activeFilters }: GalleryFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilter = useCallback(
    (group: FilterGroup, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(group);
      } else {
        params.set(group, value);
      }
      router.push(`/gallery?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-3 mb-8">
      {(Object.entries(FILTER_GROUPS) as [FilterGroup, (typeof FILTER_GROUPS)[FilterGroup]][]).map(
        ([group, { label, options }]) => (
          <div key={group} className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground shrink-0 w-20">
              {label}:
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => handleFilter(group, null)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  !activeFilters[group]
                    ? 'bg-[--brand-accent] text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All
              </button>
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleFilter(group, option)}
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    activeFilters[group] === option
                      ? 'bg-[--brand-accent] text-white'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
