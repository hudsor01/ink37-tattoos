import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Calendar container */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-16" />
          </div>
          <Skeleton className="h-7 w-40" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-14" />
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="space-y-1 p-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              {i % 5 === 0 && <Skeleton className="h-4 w-full" />}
              {i % 7 === 2 && <Skeleton className="h-4 w-3/4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
