'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';

export function CartIcon() {
  const totalItems = useCartStore((s) => s.totalItems);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted ? totalItems() : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => {
        // Dispatch custom event to open cart drawer
        window.dispatchEvent(new CustomEvent('toggle-cart'));
      }}
      aria-label="Shopping cart"
    >
      <ShoppingCart className="size-5" />
      {mounted && count > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
          {count}
        </span>
      )}
    </Button>
  );
}
