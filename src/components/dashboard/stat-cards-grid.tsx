import { StatCard, StatCardSkeleton, type StatCardProps } from './stat-card';
import { cn } from '@/lib/utils';

interface StatCardsGridProps {
  /** Array of stat card configurations */
  cards: StatCardProps[];
  /** Additional CSS classes for the grid container */
  className?: string;
}

/**
 * Responsive grid layout for StatCard components.
 * 1 column on mobile, 2 on tablet, 4 on desktop.
 */
export function StatCardsGrid({ cards, className }: StatCardsGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {cards.map((cardProps, index) => (
        <StatCard key={cardProps.title || index} {...cardProps} />
      ))}
    </div>
  );
}

interface StatCardsGridSkeletonProps {
  /** Number of skeleton cards to render (default: 4) */
  count?: number;
  /** Additional CSS classes for the grid container */
  className?: string;
}

/**
 * Loading skeleton for the stat cards grid.
 */
export function StatCardsGridSkeleton({ count = 4, className }: StatCardsGridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
