'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { updateOrderStatusAction, refundOrderAction } from '@/lib/actions/order-actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Truck, PackageCheck, XCircle, RotateCcw, Download, Mail, MapPin, Calendar } from 'lucide-react';

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number | { toString(): string };
  totalPrice: number | { toString(): string };
  product: {
    id: string;
    name: string;
    productType: string;
    imageUrl: string | null;
  } | null;
};

type DownloadToken = {
  id: string;
  token: string;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: Date;
};

type OrderWithFullDetails = {
  id: string;
  email: string;
  status: string;
  subtotal: number | { toString(): string };
  shippingAmount: number | { toString(): string };
  discountAmount: number | { toString(): string };
  total: number | { toString(): string };
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  giftCardCode: string | null;
  notes: string | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  downloadTokens: DownloadToken[];
};

interface OrderDetailProps {
  order: OrderWithFullDetails;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatAmount(amount: number | { toString(): string }): string {
  return currencyFormatter.format(Number(amount.toString()));
}

export function OrderDetail({ order }: OrderDetailProps) {
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

  const hasPhysicalItems = order.items.some(
    (item) => item.product?.productType === 'PHYSICAL'
  );
  const hasShippingInfo = order.shippingName || order.shippingAddress;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
      {/* Left column: Order items */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} x {formatAmount(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-medium shrink-0">
                    {formatAmount(item.totalPrice)}
                  </p>
                </div>
              ))}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatAmount(order.subtotal)}</span>
                </div>
                {Number(order.shippingAmount.toString()) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatAmount(order.shippingAmount)}</span>
                  </div>
                )}
                {Number(order.discountAmount.toString()) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">
                      -{formatAmount(order.discountAmount)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{formatAmount(order.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Tokens */}
        {order.downloadTokens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.downloadTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-mono text-sm">{token.token.slice(0, 16)}...</p>
                      <p className="text-xs text-muted-foreground">
                        Downloads: {token.downloadCount}/{token.maxDownloads}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires: {format(new Date(token.expiresAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right column: Status + Shipping + Customer */}
      <div className="space-y-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
            </div>

            <div className="flex flex-col gap-2">
              {order.status === 'PENDING' && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="destructive" className="w-full" disabled={isPending}>
                        <XCircle className="h-4 w-4" />
                        Cancel Order
                      </Button>
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
              )}

              {order.status === 'PAID' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleStatusUpdate('SHIPPED')}
                    disabled={isPending}
                  >
                    <Truck className="h-4 w-4" />
                    {isPending ? 'Updating...' : 'Mark as Shipped'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="destructive" className="w-full" disabled={isPending}>
                          <XCircle className="h-4 w-4" />
                          Cancel Order
                        </Button>
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
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="outline" className="w-full text-destructive" disabled={isPending}>
                          <RotateCcw className="h-4 w-4" />
                          Issue Refund
                        </Button>
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

              {order.status === 'SHIPPED' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleStatusUpdate('DELIVERED')}
                    disabled={isPending}
                  >
                    <PackageCheck className="h-4 w-4" />
                    {isPending ? 'Updating...' : 'Mark as Delivered'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="outline" className="w-full text-destructive" disabled={isPending}>
                          <RotateCcw className="h-4 w-4" />
                          Issue Refund
                        </Button>
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

              {order.status === 'DELIVERED' && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="outline" className="w-full text-destructive" disabled={isPending}>
                        <RotateCcw className="h-4 w-4" />
                        Issue Refund
                      </Button>
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
              )}
            </div>

            {order.notes && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Info */}
        {hasPhysicalItems && hasShippingInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                {order.shippingName && (
                  <p className="font-medium">{order.shippingName}</p>
                )}
                {order.shippingAddress && <p>{order.shippingAddress}</p>}
                {(order.shippingCity || order.shippingState || order.shippingPostalCode) && (
                  <p>
                    {[order.shippingCity, order.shippingState, order.shippingPostalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {order.shippingCountry && <p>{order.shippingCountry}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.email}</p>
            {order.giftCardCode && (
              <div className="mt-2 rounded-md bg-muted p-2">
                <p className="text-xs text-muted-foreground">Gift card applied</p>
                <p className="text-sm font-mono">{order.giftCardCode}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(order.updatedAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
