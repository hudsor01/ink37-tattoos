'use client';

import { type ColumnDef } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
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
import { format } from 'date-fns';
import { MoreHorizontal, Eye, Truck, PackageCheck, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { updateOrderStatusAction, refundOrderAction } from '@/lib/actions/order-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type OrderWithItems = {
  id: string;
  email: string;
  status: string;
  total: number | { toString(): string };
  createdAt: Date;
  items: Array<{ id: string }>;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function OrderActions({ order }: { order: OrderWithItems }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusUpdate(status: string) {
    startTransition(() => {
      const formData = new FormData();
      formData.append('orderId', order.id);
      formData.append('status', status);
      toast.promise(
        updateOrderStatusAction(formData).then((result) => {
          if (!result.success) throw new Error('Failed');
          router.refresh();
          return result;
        }),
        {
          loading: 'Updating order...',
          success: `Order marked as ${status.toLowerCase()}.`,
          error: "Changes couldn't be saved. Please try again.",
        }
      );
    });
  }

  function handleRefund() {
    startTransition(() => {
      const formData = new FormData();
      formData.append('orderId', order.id);
      toast.promise(
        refundOrderAction(formData).then((result) => {
          if (!result.success) throw new Error('Failed');
          router.refresh();
          return result;
        }),
        {
          loading: 'Processing refund...',
          success: 'Refund processed successfully.',
          error: "Changes couldn't be saved. Please try again.",
        }
      );
    });
  }

  const canShip = order.status === 'PAID';
  const canDeliver = order.status === 'SHIPPED';
  const canCancel = order.status === 'PENDING' || order.status === 'PAID';
  const canRefund = ['PAID', 'SHIPPED', 'DELIVERED'].includes(order.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/dashboard/orders/${order.id}`} />}>
          <Eye className="h-4 w-4" />
          View Details
        </DropdownMenuItem>

        {canShip && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStatusUpdate('SHIPPED')}
              disabled={isPending}
            >
              <Truck className="h-4 w-4" />
              Mark as Shipped
            </DropdownMenuItem>
          </>
        )}

        {canDeliver && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStatusUpdate('DELIVERED')}
              disabled={isPending}
            >
              <PackageCheck className="h-4 w-4" />
              Mark as Delivered
            </DropdownMenuItem>
          </>
        )}

        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent focus:bg-accent">
                    <XCircle className="h-4 w-4" />
                    Cancel Order
                  </button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the order. The customer will be notified and refunded if payment was collected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Order</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => handleStatusUpdate('CANCELLED')}
                    disabled={isPending}
                  >
                    {isPending ? 'Cancelling...' : 'Cancel Order'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {canRefund && (
          <>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent focus:bg-accent">
                    <RotateCcw className="h-4 w-4" />
                    Issue Refund
                  </button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Issue Refund</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will process a refund through Stripe. The customer will receive the refund within 5-10 business days.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleRefund}
                    disabled={isPending}
                  >
                    {isPending ? 'Processing...' : 'Issue Refund'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const orderColumns: ColumnDef<OrderWithItems, unknown>[] = [
  {
    id: 'orderNumber',
    header: 'Order #',
    accessorFn: (row) => row.id.slice(0, 8),
    cell: ({ row }) => (
      <Link
        href={`/dashboard/orders/${row.original.id}`}
        className="font-mono text-sm text-primary hover:underline"
      >
        {row.original.id.slice(0, 8)}
      </Link>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), 'MMM d, yyyy'),
    enableSorting: true,
  },
  {
    accessorKey: 'email',
    header: 'Customer',
    enableSorting: true,
  },
  {
    id: 'items',
    header: 'Items',
    accessorFn: (row) => row.items.length,
    cell: ({ row }) => {
      const count = row.original.items.length;
      return (
        <span className="text-muted-foreground">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      );
    },
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => (
      <span className="text-right font-medium">
        {currencyFormatter.format(Number(row.original.total.toString()))}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => <OrderActions order={row.original} />,
    enableSorting: false,
  },
];
