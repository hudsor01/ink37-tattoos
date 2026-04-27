import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { getActiveProducts } from '@/lib/dal/products';
import { ProductGrid } from '@/components/store/product-grid';


export const metadata: Metadata = {
  title: 'Shop | Ink 37 Tattoos',
  description: 'Merchandise, art prints, and gift cards from Ink 37.',
};

async function Products() {
  await connection();
  const products = await getActiveProducts();

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Shop Coming Soon</h1>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">
          We&apos;re preparing our collection. Check back soon or book a
          consultation to start your tattoo journey.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Shop</h1>
        <p className="mt-1 text-muted-foreground">
          Merchandise, art prints, and gift cards from Ink 37.
        </p>
      </div>
      <ProductGrid
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          imageUrl: p.imageUrl,
          productType: p.productType,
        }))}
      />
    </>
  );
}

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function StorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
      <Suspense fallback={<ProductsSkeleton />}>
        <Products />
      </Suspense>
    </div>
  );
}
