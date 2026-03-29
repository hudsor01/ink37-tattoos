import { connection } from 'next/server';
import { getOrders, getOrderStats } from '@/lib/dal/orders';
import { ResponsiveDataTable } from '@/components/dashboard/responsive-data-table';
import { KPICard } from '@/components/dashboard/kpi-card';
import { orderColumns, orderMobileFields } from './columns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/dashboard/empty-state';
import { DollarSign, Clock, ShoppingBag } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default async function OrdersPage() {
  await connection();
  const [orders, stats] = await Promise.all([
    getOrders(),
    getOrderStats(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Orders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          View and manage store orders.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard
          title="Total Revenue"
          value={currencyFormatter.format(stats.totalRevenue)}
          icon={DollarSign}
          description="From completed orders"
        />
        <KPICard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={Clock}
          description="Awaiting fulfillment"
        />
        <KPICard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingBag}
          description="All time"
        />
      </div>

      {orders.length > 0 ? (
        <ResponsiveDataTable
          columns={orderColumns}
          data={orders}
          searchKey="email"
          searchPlaceholder="Search by email..."
          pageSize={15}
          mobileFields={orderMobileFields}
        />
      ) : (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Orders from your online store will appear here."
        />
      )}
    </div>
  );
}
