import type { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatTrend = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  /** Card heading */
  title: string;
  /** Primary display value (pre-formatted string or number) */
  value: string | number;
  /** Percentage change from the previous period */
  change?: number;
  /** Direction of the trend arrow */
  trend?: StatTrend;
  /** Lucide icon rendered in the card header */
  icon?: LucideIcon;
  /** Additional context shown below the value */
  description?: string;
  /** When true, renders a skeleton placeholder instead of content */
  loading?: boolean;
}

const trendConfig: Record<StatTrend, { Icon: LucideIcon; color: string }> = {
  up: { Icon: ArrowUp, color: 'text-green-600' },
  down: { Icon: ArrowDown, color: 'text-red-600' },
  neutral: { Icon: Minus, color: 'text-muted-foreground' },
};

function resolveTrend(change: number | undefined, explicit?: StatTrend): StatTrend {
  if (explicit) return explicit;
  if (change === undefined || change === 0) return 'neutral';
  return change > 0 ? 'up' : 'down';
}

export function StatCard({
  title,
  value,
  change,
  trend: explicitTrend,
  icon: Icon,
  description,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return <StatCardSkeleton />;
  }

  const trend = resolveTrend(change, explicitTrend);
  const { Icon: TrendIcon, color } = trendConfig[trend];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {change !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <TrendIcon className={cn('h-3 w-3', color)} aria-hidden="true" />
            <span className={cn('font-medium', color)}>
              {Math.abs(change)}%
            </span>
            <span className="text-muted-foreground">vs prev period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="mt-2 h-3 w-28" />
      </CardContent>
    </Card>
  );
}
