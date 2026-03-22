import Link from 'next/link';
import { CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { ClearCartOnMount } from './clear-cart';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Confirmed | Ink 37 Tattoos',
};

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  let order: {
    id: string;
    items: Array<{
      id: string;
      productName: string;
      product: { productType: string };
      downloadTokens: Array<{ token: string }>;
    }>;
  } | null = null;
  let orderType: 'physical' | 'digital' | 'gift_card' | 'mixed' = 'physical';

  if (session_id) {
    order = await db.order.findFirst({
      where: { stripeCheckoutSessionId: session_id },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            productName: true,
            product: { select: { productType: true } },
            downloadTokens: { select: { token: true } },
          },
        },
      },
    });

    if (order) {
      const types = new Set(order.items.map((i) => i.product.productType));
      if (types.has('GIFT_CARD') && types.size === 1) orderType = 'gift_card';
      else if (types.has('DIGITAL') && !types.has('PHYSICAL')) orderType = 'digital';
      else if (types.has('PHYSICAL') && !types.has('DIGITAL')) orderType = 'physical';
      else orderType = 'mixed';
    }
  }

  // Check if gift card purchase (no order created -- handled via webhook metadata)
  if (!order && session_id) {
    orderType = 'gift_card';
  }

  const messages: Record<string, string> = {
    physical:
      "Thanks for your order! You'll receive a shipping confirmation email once your items are on the way.",
    digital:
      "Thanks for your order! Your download links have been sent to your email. Links expire in 72 hours.",
    gift_card:
      'Gift card sent! The recipient will receive an email with their redemption code.',
    mixed:
      "Thanks for your order! Digital downloads have been sent to your email, and physical items will ship soon.",
  };

  const digitalItems = order?.items.filter(
    (i) => i.product.productType === 'DIGITAL' && i.downloadTokens.length > 0
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <ClearCartOnMount />
      <CheckCircle className="mx-auto size-16 text-green-600" />
      <h1 className="mt-6 text-2xl font-semibold">Order Confirmed</h1>
      <p className="mt-3 text-muted-foreground">{messages[orderType]}</p>

      {order && (
        <p className="mt-4 text-sm text-muted-foreground">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </p>
      )}

      {digitalItems && digitalItems.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold">Your Downloads</h2>
          {digitalItems.map((item) =>
            item.downloadTokens.map((dt) => (
              <Link
                key={dt.token}
                href={`/api/store/download?token=${dt.token}`}
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="size-4" />
                {item.productName}
              </Link>
            ))
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button render={<Link href="/store" />}>Continue Shopping</Button>
        <Button variant="outline" render={<Link href="/" />}>Back to Home</Button>
      </div>
    </div>
  );
}
