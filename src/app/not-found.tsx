import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This page doesn&apos;t exist. Head back to the homepage or browse our
          gallery.
        </p>
        <div className="flex gap-4 justify-center">
          <Button render={<Link href="/" />}>Go Home</Button>
          <Button variant="outline" render={<Link href="/gallery" />}>View Gallery</Button>
        </div>
      </div>
    </div>
  );
}
