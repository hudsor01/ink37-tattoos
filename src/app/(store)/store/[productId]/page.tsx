import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProductById } from '@/lib/dal/products';
import { formatCurrency } from '@/lib/store-helpers';
import { AddToCartButton } from './add-to-cart-button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);
  if (!product) return { title: 'Product Not Found' };
  return {
    title: `${product.name} | Ink 37 Tattoos`,
    description: product.description ?? `${product.name} from the Ink 37 store.`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product || !product.isActive) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/store" />}>Shop</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-lg font-semibold">
            {formatCurrency(Number(product.price))}
          </p>
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          {product.productType === 'GIFT_CARD' ? (
            <Button size="lg" className="w-full" render={<Link href="/store/gift-cards" />}>
              Purchase Gift Card
            </Button>
          ) : (
            <>
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  imageUrl: product.imageUrl ?? '',
                  productType: product.productType as 'PHYSICAL' | 'DIGITAL',
                }}
              />
              {product.productType === 'DIGITAL' && (
                <p className="text-sm text-muted-foreground text-center">
                  Digital download -- delivered via email
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
