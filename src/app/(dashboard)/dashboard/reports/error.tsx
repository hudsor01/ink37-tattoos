'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ReportsError({
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
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <h2 className="mb-2 text-2xl font-semibold">Reports Error</h2>
        <p className="mb-6 text-muted-foreground">
          Something went wrong loading reports.
        </p>
        <div className="mb-4 flex justify-center gap-4">
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
          <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
