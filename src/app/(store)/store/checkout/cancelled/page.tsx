import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout Cancelled | Ink 37 Tattoos',
};

export default function CheckoutCancelledPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <XCircle className="mx-auto size-16 text-muted-foreground" />
      <h1 className="mt-6 text-2xl font-semibold">Checkout Cancelled</h1>
      <p className="mt-3 text-muted-foreground">
        Your order was not completed. Your cart items are still saved -- return
        to the shop when you&apos;re ready.
      </p>
      <div className="mt-8">
        <Button render={<Link href="/store" />}>Return to Shop</Button>
      </div>
    </div>
  );
}
