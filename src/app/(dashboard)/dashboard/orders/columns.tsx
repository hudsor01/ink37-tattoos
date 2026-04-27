'use client';

import { type ColumnDef } from '@/components/dashboard/data-table';
import { type MobileField } from '@/components/dashboard/responsive-data-table';
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
import { useTransition, useOptimistic } from 'react';

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
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(order.status);

  function handleStatusUpdate(status: string) {
    startTransition(async () => {
      setOptimisticStatus(status);
      try {
        const formData = new FormData();
        formData.append('orderId', order.id);
        formData.append('status', status);
        const result = await updateOrderStatusAction(formData);
        if (result.success) {
          if (status === 'CANCELLED') {
            toast.warning('Order cancelled');
          } else {
            toast.info(`Order marked as ${status.toLowerCase()}`);
          }
          router.refresh();
        }
      } catch {
        toast.error("Changes couldn't be saved. Please try again.");
      }
    });
  }

  function handleRefund() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('orderId', order.id);
        const result = await refundOrderAction(formData);
        if (result.success) {
          toast.warning('Refund processed');
          router.refresh();
        }
      } catch {
        toast.error("Changes couldn't be saved. Please try again.");
      }
    });
  }

  const canShip = optimisticStatus === 'PAID';
  const canDeliver = optimisticStatus === 'SHIPPED';
  const canCancel = optimisticStatus === 'PENDING' || optimisticStatus === 'PAID';
  const canRefund = ['PAID', 'SHIPPED', 'DELIVERED'].includes(optimisticStatus);

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
                  <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-destructive outline-hidden hover:bg-accent focus:bg-accent">
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
                  <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-destructive outline-hidden hover:bg-accent focus:bg-accent">
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

export const orderMobileFields: MobileField<OrderWithItems>[] = [
  { label: 'Order #', accessor: (o) => o.id.slice(0, 8) },
  { label: 'Customer', accessor: (o) => o.email },
  { label: 'Total', accessor: (o) => currencyFormatter.format(Number(o.total.toString())) },
  { label: 'Status', accessor: (o) => <StatusBadge status={o.status} /> },
];
