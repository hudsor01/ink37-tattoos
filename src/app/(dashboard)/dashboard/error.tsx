'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-semibold mb-2">Dashboard Error</h2>
        <p className="text-muted-foreground mb-6">
          Something went wrong loading this page.
        </p>
        <div className="flex gap-4 justify-center mb-4">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" render={<Link href="/dashboard" />}>Go to Dashboard</Button>
        </div>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-muted-foreground underline"
        >
          {showDetails ? 'Hide' : 'Show'} details
        </button>
        {showDetails && (
          <pre className="mt-2 text-xs text-left bg-muted p-3 rounded-md overflow-auto max-h-40">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
