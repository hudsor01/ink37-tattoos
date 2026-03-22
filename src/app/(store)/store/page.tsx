import { getActiveProducts } from '@/lib/dal/products';
import { ProductGrid } from '@/components/store/product-grid';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop | Ink 37 Tattoos',
  description: 'Merchandise, art prints, and gift cards from Ink 37.',
};

export default async function StorePage() {
  const products = await getActiveProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
      {products.length === 0 ? (
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold">Shop Coming Soon</h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            We&apos;re preparing our collection. Check back soon or book a
            consultation to start your tattoo journey.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold">Shop</h1>
            <p className="mt-1 text-muted-foreground">
              Merchandise, art prints, and gift cards from Ink 37.
            </p>
          </div>
          <ProductGrid products={products.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            imageUrl: p.imageUrl,
            productType: p.productType,
          }))} />
        </>
      )}
    </div>
  );
}
