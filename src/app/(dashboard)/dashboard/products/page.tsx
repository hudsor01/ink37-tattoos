import { connection } from 'next/server';
import { getProducts } from '@/lib/dal/products';
import { ResponsiveDataTable } from '@/components/dashboard/responsive-data-table';
import { productColumns, productMobileFields } from './columns';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/dashboard/empty-state';
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
        <ResponsiveDataTable
          columns={productColumns}
          data={products}
          searchKey="name"
          searchPlaceholder="Search products..."
          pageSize={15}
          mobileFields={productMobileFields}
          enableCsvExport
          csvFilename="products.csv"
          enableShowAll
          enablePageJump
        />
      ) : (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add products to sell through your online store."
          action={
            <Button render={<Link href="/dashboard/products/new" />}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          }
        />
      )}
    </div>
  );
}
