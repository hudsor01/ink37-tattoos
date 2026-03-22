'use client';

import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    productType: 'PHYSICAL' | 'DIGITAL';
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      productType: product.productType,
    });
    // Open cart drawer
    window.dispatchEvent(new CustomEvent('open-cart'));
  };

  return (
    <Button size="lg" className="w-full" onClick={handleAdd}>
      Add to Cart
    </Button>
  );
}
