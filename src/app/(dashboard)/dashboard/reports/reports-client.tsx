'use client';

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { DollarSign, CheckCircle2, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { RevenueComposedChart, BookingTrendsChart } from '@/components/dashboard/analytics-chart';
import { PaymentBreakdownChart, TaxSummaryTable, DEFAULT_TAX_RATE } from '@/components/dashboard/reports-charts';
import { exportToCsv } from '@/lib/utils/csv-export';

interface ReportsClientProps {
  revenueData: { month: string; revenue: number; count: number }[];
  paymentBreakdown: { type: string; total: number; count: number }[];
  bookingTrends: { week: string; bookings: number; cancellations: number }[];
  stats: {
    totalCustomers: number;
    totalAppointments: number;
    completedSessions: number;
    totalRevenue: number;
    recentAppointments: unknown[];
  };
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReportsClient({ revenueData, paymentBreakdown, bookingTrends, stats }: ReportsClientProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const avgRevenuePerSession = stats.completedSessions > 0
    ? stats.totalRevenue / stats.completedSessions
    : 0;

  function handleExportCsv() {
    const rows = revenueData.map((row) => {
      const tax = row.revenue * DEFAULT_TAX_RATE;
      return {
        Month: row.month,
        Revenue: row.revenue.toFixed(2),
        Sessions: row.count,
        Tax: tax.toFixed(2),
        'Net Revenue': (row.revenue - tax).toFixed(2),
      };
    });
    exportToCsv('financial-report.csv', rows);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financial Reports</h1>
          <p className="text-muted-foreground">
            Revenue trends, payment breakdown, and tax summaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From completed sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue / Session</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgRevenuePerSession)}</div>
            <p className="text-xs text-muted-foreground">Per completed session</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length > 0 ? (
            <RevenueComposedChart data={revenueData} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No revenue data available for this period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Breakdown + Tax Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentBreakdown.length > 0 ? (
              <PaymentBreakdownChart data={paymentBreakdown} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No payment data available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <TaxSummaryTable data={revenueData} taxRate={DEFAULT_TAX_RATE} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No revenue data available for tax calculations.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingTrends.length > 0 ? (
            <BookingTrendsChart data={bookingTrends} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No booking data available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
