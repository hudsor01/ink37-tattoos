import { connection } from 'next/server';
import { getProductById } from '@/lib/dal/products';
import { getProductImages } from '@/lib/dal/product-images';
import { ProductForm } from '@/components/dashboard/product-form';
import { ProductImageGallery } from '@/components/dashboard/product-image-gallery';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [product, images] = await Promise.all([
    getProductById(id),
    getProductImages(id),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/products">Products</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/products">{product.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground">
          Update product details for &quot;{product.name}&quot;.
        </p>
      </div>

      <ProductForm mode="edit" product={product} />

      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
          <CardDescription>
            Drag to reorder images. The first visible image is used as the primary product image in the store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductImageGallery productId={product.id} images={images} />
        </CardContent>
      </Card>
    </div>
  );
}
