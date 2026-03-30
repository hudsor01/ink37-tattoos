'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import {
  DollarSign,
  Clock,
  UserX,
  Download,
  ArrowLeftRight,
  FileText,
  Percent,
  Gauge,
  AlertTriangle,
  BarChart3,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { KPICard } from '@/components/dashboard/kpi-card';
import {
  RevenueChart,
  RevenueComposedChart,
  ClientAcquisitionChart,
  AppointmentTypeChart,
  BookingTrendsChart,
  RevenueByStyleChart,
  RevenueBySizeChart,
  PaymentRatesChart,
  BookingFunnelChart,
  PeakHoursHeatmap,
  CustomerCLVChart,
  ChurnRiskTable,
  DurationByTypeChart,
  NoShowTrendsChart,
} from '@/components/dashboard/analytics-chart';
import { exportToCsv } from '@/lib/utils/csv-export';
import { toast } from 'sonner';
import type { AnalyticsData, ComparisonData, AnalyticsDepthData } from '@/lib/dal/analytics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnalyticsClientProps {
  analyticsData: AnalyticsData;
  comparisonData: ComparisonData | null;
  depthData: AnalyticsDepthData;
  from: string;
  to: string;
  initialTab: string;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatHours(value: number): string {
  return `${value.toFixed(1)}h`;
}

export function AnalyticsClient({ analyticsData, comparisonData, depthData, from, to, initialTab }: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateRange: DateRange | undefined = { from: new Date(from), to: new Date(to) };
  const isComparing = searchParams.get('compare') === 'true';
  const activeTab = searchParams.get('tab') || initialTab;

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', format(range.from, 'yyyy-MM-dd'));
      params.set('to', format(range.to, 'yyyy-MM-dd'));
      router.push(`/dashboard/analytics?${params.toString()}`);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('from');
      params.delete('to');
      router.push(`/dashboard/analytics?${params.toString()}`);
    }
  }, [router, searchParams]);

  const handleToggleComparison = useCallback((checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set('compare', 'true');
    } else {
      params.delete('compare');
    }
    router.push(`/dashboard/analytics?${params.toString()}`);
  }, [router, searchParams]);

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    router.push(`/dashboard/analytics?${params.toString()}`);
  }, [router, searchParams]);

  function handleExportCsv() {
    const { revenueData, kpis, appointmentTypes } = analyticsData;
    const rows: Record<string, unknown>[] = [];

    switch (activeTab) {
      case 'revenue': {
        // Revenue by style rows
        for (const item of depthData.revenueByStyle) {
          rows.push({ Category: 'Revenue by Style', Label: item.style, Value: item.revenue.toFixed(2), Count: item.count });
        }
        // Revenue by size rows
        for (const item of depthData.revenueBySize) {
          rows.push({ Category: 'Revenue by Size', Label: item.size, Value: item.revenue.toFixed(2), Count: item.count });
        }
        // Payment rates summary
        rows.push({ Category: 'Payment Rates', Label: 'Total Payments', Value: depthData.paymentRates.total, Count: '' });
        rows.push({ Category: 'Payment Rates', Label: 'Success Rate', Value: `${depthData.paymentRates.successRate}%`, Count: '' });
        rows.push({ Category: 'Payment Rates', Label: 'Refund Rate', Value: `${depthData.paymentRates.refundRate}%`, Count: '' });
        rows.push({ Category: 'Payment Rates', Label: 'Failure Rate', Value: `${depthData.paymentRates.failureRate}%`, Count: '' });
        rows.push({ Category: 'KPI', Label: 'Avg Transaction Value', Value: depthData.avgTransactionValue.toFixed(2), Count: '' });
        break;
      }
      case 'bookings': {
        for (const item of depthData.bookingFunnel) {
          rows.push({ Category: 'Booking Funnel', Label: item.stage, Value: item.value, Count: '' });
        }
        for (const item of depthData.peakHours) {
          rows.push({ Category: 'Peak Hours', Label: `${item.hour}:00`, Value: item.count, Count: '' });
        }
        rows.push({ Category: 'KPI', Label: 'Capacity Utilization', Value: `${depthData.capacityUtilization}%`, Count: '' });
        break;
      }
      case 'customers': {
        for (const item of depthData.customerCLV) {
          rows.push({ Category: 'Customer CLV', Label: item.name, Value: item.clv.toFixed(2), Count: item.sessions });
        }
        for (const item of depthData.churnRisk) {
          rows.push({ Category: 'Churn Risk', Label: item.name, Value: item.email ?? '', Count: item.lastActivity ? new Date(item.lastActivity).toISOString().split('T')[0] : 'Never' });
        }
        rows.push({ Category: 'KPI', Label: 'Repeat Client Rate', Value: `${depthData.repeatClientRate}%`, Count: '' });
        break;
      }
      case 'operations': {
        for (const item of depthData.durationByType) {
          rows.push({ Category: 'Duration by Type', Label: item.type, Value: `${item.avgDuration.toFixed(1)}h`, Count: item.count });
        }
        for (const item of depthData.noShowTrends) {
          rows.push({ Category: 'No-Show Trends', Label: item.month, Value: `${item.rate}%`, Count: `${item.noShows}/${item.total}` });
        }
        rows.push({ Category: 'KPI', Label: 'Scheduling Efficiency', Value: `${depthData.schedulingEfficiency}%`, Count: '' });
        break;
      }
      default: {
        // Overview tab: existing behavior
        for (const row of revenueData) {
          rows.push({ Month: row.month, Revenue: row.revenue.toFixed(2), Sessions: row.count });
        }
        for (const item of appointmentTypes) {
          rows.push({ Month: `[Type] ${item.type}`, Revenue: '', Sessions: item.count });
        }
        rows.push({ Month: '[KPI Summary]', Revenue: '', Sessions: '' });
        rows.push({ Month: 'CLV', Revenue: kpis.clv.toFixed(2), Sessions: '' });
        rows.push({ Month: 'No-Show Rate', Revenue: `${kpis.noShowRate.toFixed(1)}%`, Sessions: '' });
        rows.push({ Month: 'Avg Session Duration', Revenue: `${kpis.avgSessionDuration.toFixed(1)}h`, Sessions: '' });
        break;
      }
    }

    exportToCsv(`analytics-${activeTab}-report.csv`, rows);
  }

  async function handleExportPdf() {
    const params = new URLSearchParams();
    if (dateRange?.from) params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('to', format(dateRange.to, 'yyyy-MM-dd'));

    toast.promise(
      fetch(`/api/analytics/export/pdf?${params.toString()}`).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'PDF export failed');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analytics-report.pdf';
        link.click();
        URL.revokeObjectURL(url);
      }),
      {
        loading: 'Generating PDF...',
        success: 'PDF downloaded',
        error: (err: Error) => err.message || 'Failed to generate PDF',
      }
    );
  }

  const { revenueData, clientData, appointmentTypes, bookingTrends, kpis } = analyticsData;
  const hasData = revenueData.length > 0 || clientData.length > 0 || appointmentTypes.length > 0;

  // Comparison data for KPI trends
  const clvTrend = comparisonData ? { value: comparisonData.trends.clvTrend, label: 'vs prev period' } : undefined;
  const noShowTrend = comparisonData
    ? { value: -comparisonData.trends.noShowRateTrend, label: 'vs prev period' } // Invert: lower no-show is better
    : undefined;
  const durationTrend = comparisonData ? { value: comparisonData.trends.avgSessionDurationTrend, label: 'vs prev period' } : undefined;

  // Calculate avg no-show rate for Operations tab KPI
  const avgNoShowRate = depthData.noShowTrends.length > 0
    ? Math.round(depthData.noShowTrends.reduce((sum, t) => sum + t.rate, 0) / depthData.noShowTrends.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Business insights and performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  <Download className="mr-2 size-4" />
                  Export
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>
                <FileText className="mr-2 size-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileText className="mr-2 size-4" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards with new metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          title="Customer Lifetime Value"
          value={formatCurrency(kpis.clv)}
          description="Avg revenue per unique customer"
          icon={DollarSign}
          trend={clvTrend}
        />
        <KPICard
          title="No-Show Rate"
          value={formatPercent(kpis.noShowRate)}
          description="Percentage of missed appointments"
          icon={UserX}
          trend={noShowTrend}
        />
        <KPICard
          title="Avg Session Duration"
          value={formatHours(kpis.avgSessionDuration)}
          description="Average estimated hours per session"
          icon={Clock}
          trend={durationTrend}
        />
      </div>

      {/* Comparison toggle */}
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={isComparing}
            onCheckedChange={handleToggleComparison}
            size="sm"
          />
          Compare to previous period
        </label>
        {isComparing && comparisonData && (
          <span className="text-xs text-muted-foreground ml-2">
            Previous: {formatCurrency(comparisonData.previous.clv)} CLV,{' '}
            {formatPercent(comparisonData.previous.noShowRate)} no-show,{' '}
            {formatHours(comparisonData.previous.avgSessionDuration)} avg duration
          </span>
        )}
      </div>

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {!hasData ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-semibold">Not enough data</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Analytics will appear once you have appointments and sessions
                  recorded.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueData.length > 0 ? (
                    <RevenueChart data={revenueData} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Not enough data
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Acquisition</CardTitle>
                </CardHeader>
                <CardContent>
                  {clientData.length > 0 ? (
                    <ClientAcquisitionChart data={clientData} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Not enough data
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue & Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueData.length > 0 ? (
                    <RevenueComposedChart data={revenueData} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Not enough data
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appointment Types</CardTitle>
                </CardHeader>
                <CardContent>
                  {appointmentTypes.length > 0 ? (
                    <AppointmentTypeChart data={appointmentTypes} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Not enough data
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Booking Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingTrends.length > 0 ? (
                    <BookingTrendsChart data={bookingTrends} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Not enough data
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Revenue Tab (ANLYT-01) */}
        <TabsContent value="revenue">
          {depthData.revenueByStyle.length === 0 && depthData.revenueBySize.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-semibold">Not enough revenue data</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revenue analytics will appear once you have completed sessions with pricing data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KPICard
                  title="Avg Transaction Value"
                  value={formatCurrency(depthData.avgTransactionValue)}
                  description="Average revenue per completed session"
                  icon={DollarSign}
                />
                <KPICard
                  title="Payment Success Rate"
                  value={formatPercent(depthData.paymentRates.successRate)}
                  description={`${depthData.paymentRates.total} total payments`}
                  icon={Percent}
                />
                <KPICard
                  title="Refund Rate"
                  value={formatPercent(depthData.paymentRates.refundRate)}
                  description="Percentage of payments refunded"
                  icon={AlertTriangle}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Style</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RevenueByStyleChart data={depthData.revenueByStyle} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RevenueBySizeChart data={depthData.revenueBySize} />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentRatesChart data={depthData.paymentRates} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Bookings Tab (ANLYT-02) */}
        <TabsContent value="bookings">
          {depthData.bookingFunnel.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-semibold">Not enough booking data</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Booking analytics will appear once you have inquiries and appointments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <KPICard
                  title="Capacity Utilization"
                  value={formatPercent(depthData.capacityUtilization)}
                  description="Booked hours vs available hours"
                  icon={Gauge}
                />
                <KPICard
                  title="Total Inquiries"
                  value={depthData.bookingFunnel[0]?.value ?? 0}
                  description="Contact form submissions in period"
                  icon={BarChart3}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingFunnelChart data={depthData.bookingFunnel} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Peak Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PeakHoursHeatmap data={depthData.peakHours} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Customers Tab (ANLYT-03) */}
        <TabsContent value="customers">
          {depthData.customerCLV.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-semibold">Not enough customer data</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Customer analytics will appear once you have completed sessions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <KPICard
                  title="Repeat Client Rate"
                  value={formatPercent(depthData.repeatClientRate)}
                  description="Customers with 2+ sessions"
                  icon={Users}
                />
                <KPICard
                  title="Churn Risk"
                  value={`${depthData.churnRisk.length} clients`}
                  description="Inactive for 90+ days"
                  icon={AlertTriangle}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Lifetime Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CustomerCLVChart data={depthData.customerCLV} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Churn Risk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChurnRiskTable data={depthData.churnRisk} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Operations Tab (ANLYT-04) */}
        <TabsContent value="operations">
          {depthData.durationByType.length === 0 && depthData.noShowTrends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-semibold">Not enough operational data</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Operational analytics will appear once you have sessions and appointment history.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <KPICard
                  title="Scheduling Efficiency"
                  value={formatPercent(depthData.schedulingEfficiency)}
                  description="Booked vs available time slots"
                  icon={Gauge}
                />
                <KPICard
                  title="Avg No-Show Rate"
                  value={formatPercent(avgNoShowRate)}
                  description="Average across all months in period"
                  icon={UserX}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Duration by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DurationByTypeChart data={depthData.durationByType} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>No-Show Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NoShowTrendsChart data={depthData.noShowTrends} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
