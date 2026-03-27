import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PublicNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This page doesn&apos;t exist or may have been moved.
        </p>
        <Button render={<Link href="/" />}>Go Home</Button>
      </div>
    </div>
  );
}
