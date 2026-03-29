import { Card, CardContent } from '@/components/ui/card';

function SkeletonRow() {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 py-3">
        <div className="mt-1.5 h-2 w-2 rounded-full bg-muted animate-pulse" />
        <div className="mt-0.5 h-5 w-5 rounded bg-muted animate-pulse" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
        </div>
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        <div className="mt-2 h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
