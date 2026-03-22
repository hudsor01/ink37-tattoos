'use client';

import { type ColumnDef } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { deleteProductAction } from '@/lib/actions/product-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type ProductWithCount = {
  id: string;
  name: string;
  price: number | { toString(): string };
  productType: string;
  imageUrl: string | null;
  isActive: boolean;
  _count: { orderItems: number };
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const typeLabels: Record<string, string> = {
  PHYSICAL: 'Merch',
  DIGITAL: 'Print',
  GIFT_CARD: 'Gift Card',
};

const typeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  PHYSICAL: 'default',
  DIGITAL: 'secondary',
  GIFT_CARD: 'outline',
};

function DeleteAction({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('productId', productId);
        const result = await deleteProductAction(formData);
        if (result.success) {
          toast.success(`"${productName}" has been deactivated.`);
          router.refresh();
        }
      } catch {
        toast.error("Changes couldn't be saved. Please try again.");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent focus:bg-accent">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this product from the store. Existing orders are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? 'Deleting...' : 'Delete Product'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const productColumns: ColumnDef<ProductWithCount, unknown>[] = [
  {
    id: 'image',
    header: 'Image',
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl;
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={row.original.name}
          width={40}
          height={40}
          className="rounded object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">--</span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: true,
  },
  {
    accessorKey: 'productType',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.productType;
      return (
        <Badge variant={typeVariants[type] ?? 'secondary'}>
          {typeLabels[type] ?? type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => (
      <span className="text-right font-medium">
        {currencyFormatter.format(Number(row.original.price.toString()))}
      </span>
    ),
    enableSorting: true,
  },
  {
    id: 'orders',
    header: 'Orders',
    accessorFn: (row) => row._count.orderItems,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original._count.orderItems}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const product = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/dashboard/products/${product.id}/edit`} />}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteAction productId={product.id} productName={product.name} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
  },
];
