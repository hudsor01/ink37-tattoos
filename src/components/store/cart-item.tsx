'use client';

import Image from 'next/image';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/store-helpers';
import type { CartItem as CartItemType } from '@/stores/cart-store';

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

export function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemProps) {
  return (
    <div className="flex gap-3 py-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No img
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug line-clamp-2">{item.name}</h4>
          <span className="text-sm font-semibold shrink-0">
            {formatCurrency(item.price * item.quantity)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="size-3" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive text-xs"
            onClick={() => onRemove(item.productId)}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
