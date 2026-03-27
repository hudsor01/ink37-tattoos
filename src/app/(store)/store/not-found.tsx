import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StoreNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This product doesn&apos;t exist or is no longer available.
        </p>
        <Button render={<Link href="/store" />}>Continue Shopping</Button>
      </div>
    </div>
  );
}
