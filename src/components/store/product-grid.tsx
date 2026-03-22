'use client';

import { useState } from 'react';
import { TypeFilter } from '@/components/store/type-filter';
import { ProductCard } from '@/components/store/product-card';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  productType: string;
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filtered =
    activeFilter === 'ALL'
      ? products
      : products.filter((p) => p.productType === activeFilter);

  return (
    <div className="space-y-6">
      <TypeFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <h3 className="text-lg font-semibold">No products match this filter</h3>
          <p className="mt-2 text-muted-foreground">
            Try selecting a different category to browse more items.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
