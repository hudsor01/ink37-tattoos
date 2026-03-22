'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Merch', value: 'PHYSICAL' },
  { label: 'Prints', value: 'DIGITAL' },
  { label: 'Gift Cards', value: 'GIFT_CARD' },
] as const;

interface TypeFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function TypeFilter({ activeFilter, onFilterChange }: TypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant="secondary"
          className={cn(
            'rounded-full text-sm h-8 px-3',
            activeFilter === option.value
              ? 'bg-brand-accent text-white hover:bg-brand-accent/90'
              : 'bg-secondary text-secondary-foreground'
          )}
          onClick={() => onFilterChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
