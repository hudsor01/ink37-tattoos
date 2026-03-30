import { connection } from 'next/server';
import { getPayments, getPaymentStats } from '@/lib/dal/payments';
import { getSessions } from '@/lib/dal/sessions';
import { ResponsiveDataTable } from '@/components/dashboard/responsive-data-table';
import { KPICard } from '@/components/dashboard/kpi-card';
import { RequestPaymentDialog } from '@/components/dashboard/request-payment-dialog';
import { columns, paymentMobileFields } from './columns';
import { DollarSign, Clock, ArrowDownRight, CreditCard } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default async function PaymentsPage() {
  await connection();
  const [payments, stats, sessions] = await Promise.all([
    getPayments(),
    getPaymentStats(),
    getSessions({ limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Manage payment requests and view transaction history.
          </p>
        </div>
        <RequestPaymentDialog sessions={sessions} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Total Collected"
          value={currencyFormatter.format(stats.totalCollected)}
          icon={DollarSign}
          description="Completed payments"
        />
        <KPICard
          title="Pending"
          value={currencyFormatter.format(stats.pendingAmount)}
          icon={Clock}
          description="Awaiting payment"
        />
        <KPICard
          title="Refunded"
          value={currencyFormatter.format(stats.refundedAmount)}
          icon={ArrowDownRight}
          description="Total refunds"
        />
        <KPICard
          title="Total Payments"
          value={stats.totalPayments}
          icon={CreditCard}
          description="All transactions"
        />
      </div>

      <ResponsiveDataTable
        columns={columns}
        data={payments}
        searchKey="customer"
        searchPlaceholder="Search by customer name..."
        pageSize={15}
        mobileFields={paymentMobileFields}
        enableCsvExport
        csvFilename="payments.csv"
        enableShowAll
        enablePageJump
      />
    </div>
  );
}
