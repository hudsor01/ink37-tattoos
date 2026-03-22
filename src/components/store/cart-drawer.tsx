'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart-store';
import { storeCheckoutAction } from '@/lib/actions/store-actions';
import { formatCurrency } from '@/lib/store-helpers';
import { CartItemRow } from '@/components/store/cart-item';
import { GiftCardRedeemInput } from '@/components/store/gift-card-redeem-input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet';
import { ShoppingBag } from 'lucide-react';

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState<string | null>(null);
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [showGiftCard, setShowGiftCard] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const hasPhysicalItems = useCartStore((s) => s.hasPhysicalItems);

  // Listen for toggle-cart events from CartIcon
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener('toggle-cart', handler);
    return () => window.removeEventListener('toggle-cart', handler);
  }, []);

  // Listen for open-cart events (from add-to-cart)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-cart', handler);
    return () => window.removeEventListener('open-cart', handler);
  }, []);

  const handleCheckout = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await storeCheckoutAction({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          giftCardCode: giftCardCode ?? undefined,
        });
        if (result.success && result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          setError(result.error ?? "Couldn't start checkout. Please try again.");
        }
      } catch {
        setError("Couldn't start checkout. Please try again.");
      }
    });
  };

  const count = totalItems();
  const subtotal = totalPrice();
  const discount = giftCardCode ? Math.min(giftCardBalance, subtotal) : 0;
  const total = subtotal - discount;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart ({count} {count === 1 ? 'item' : 'items'})</SheetTitle>
          <SheetDescription className="sr-only">Shopping cart contents</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
            <ShoppingBag className="size-12 text-muted-foreground" />
            <h3 className="text-base font-semibold">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground text-center">
              Browse our shop to find merchandise, prints, and gift cards.
            </p>
            <Button variant="outline" onClick={() => setOpen(false)} render={<Link href="/store" />}>
              Browse Shop
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`}>
                  <CartItemRow
                    item={item}
                    onRemove={removeItem}
                    onUpdateQuantity={updateQuantity}
                  />
                  {idx < items.length - 1 && <Separator />}
                </div>
              ))}
            </div>

            <SheetFooter className="border-t pt-4 flex-col gap-3">
              <div className="flex w-full justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex w-full justify-between text-sm">
                <span>Shipping</span>
                <span className="text-muted-foreground">
                  {hasPhysicalItems() ? 'Calculated at checkout' : 'Free -- digital delivery'}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex w-full justify-between text-sm text-green-600">
                  <span>Gift Card</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex w-full justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              {/* Gift card redemption */}
              {!showGiftCard ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm"
                  onClick={() => setShowGiftCard(true)}
                >
                  Have a gift card?
                </Button>
              ) : (
                <GiftCardRedeemInput
                  onValidCode={(code, balance) => {
                    setGiftCardCode(code);
                    setGiftCardBalance(balance);
                  }}
                  onClear={() => {
                    setGiftCardCode(null);
                    setGiftCardBalance(0);
                  }}
                />
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
