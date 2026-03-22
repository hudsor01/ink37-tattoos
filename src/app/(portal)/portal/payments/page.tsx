import { format } from 'date-fns';
import { CreditCard, ExternalLink } from 'lucide-react';
import { getPortalPayments } from '@/lib/dal/portal';
import { StatusBadge } from '@/components/dashboard/status-badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default async function PortalPaymentsPage() {
  const payments = await getPortalPayments();

  if (payments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">No payments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payment history will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      {/* Payment table (desktop) */}
      <div className="hidden overflow-hidden rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 capitalize">
                  {payment.type
                    ? payment.type.toLowerCase().replace(/_/g, ' ')
                    : '-'}
                </td>
                <td className="px-4 py-3 font-medium">
                  {currencyFormat.format(Number(payment.amount))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3">
                  {payment.receiptUrl ? (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      View Receipt
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-friendly card view */}
      <div className="space-y-3 md:hidden">
        {payments.map((payment) => (
          <Card key={`mobile-${payment.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {currencyFormat.format(Number(payment.amount))}
                </CardTitle>
                <StatusBadge status={payment.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p>{format(new Date(payment.createdAt), 'MMM d, yyyy')}</p>
                  {payment.type && (
                    <p className="capitalize">
                      {payment.type.toLowerCase().replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                {payment.receiptUrl && (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Receipt
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
