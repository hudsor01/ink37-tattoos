import { connection } from 'next/server';
import { getProducts } from '@/lib/dal/products';
import { DataTable } from '@/components/dashboard/data-table';
import { productColumns } from './columns';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Plus, Package } from 'lucide-react';
import Link from 'next/link';

export default async function ProductsPage() {
  await connection();
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Products</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your store catalog.
          </p>
        </div>
        <Button render={<Link href="/dashboard/products/new" />}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {products.length > 0 ? (
        <DataTable
          columns={productColumns}
          data={products}
          searchKey="name"
          searchPlaceholder="Search products..."
          pageSize={15}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No products yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
            Add your first product to start selling merchandise, prints, or gift cards.
          </p>
          <Button render={<Link href="/dashboard/products/new" />}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      )}
    </div>
  );
}
