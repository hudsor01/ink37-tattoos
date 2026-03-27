import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardNotFound() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This dashboard page doesn&apos;t exist.
        </p>
        <Button render={<Link href="/dashboard" />}>Go to Dashboard</Button>
      </div>
    </div>
  );
}
