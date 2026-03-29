'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Notifications page error:', error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted-foreground">
          View and manage your notification history.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-10 w-10 text-destructive/50 mb-3" />
          <h3 className="text-lg font-semibold">Failed to load notifications</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong while loading your notifications.
          </p>
          <Button variant="outline" className="mt-4" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
