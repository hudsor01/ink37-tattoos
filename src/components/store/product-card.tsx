import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/store-helpers';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    productType: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  PHYSICAL: 'Merch',
  DIGITAL: 'Print',
  GIFT_CARD: 'Gift Card',
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/store/${product.id}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-square">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover rounded-t-xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted rounded-t-xl">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5">
          <h3 className="text-base font-semibold leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {formatCurrency(Number(product.price))}
            </span>
            <Badge variant="secondary">
              {TYPE_LABELS[product.productType] ?? product.productType}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
