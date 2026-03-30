'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { KPICard } from '@/components/dashboard/kpi-card';
import {
  RevenueChart,
  RevenueComposedChart,
  ClientAcquisitionChart,
  AppointmentTypeChart,
  BookingTrendsChart,
} from '@/components/dashboard/analytics-chart';
import { exportToCsv } from '@/lib/utils/csv-export';
import { toast } from 'sonner';
import type { AnalyticsData, ComparisonData } from '@/lib/dal/analytics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnalyticsClientProps {
  analyticsData: AnalyticsData;
  comparisonData: ComparisonData | null;
  from: string;
  to: string;
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

export function AnalyticsClient({ analyticsData, comparisonData, from, to }: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    return { from: new Date(from), to: new Date(to) };
  });
  const isComparing = searchParams.get('compare') === 'true';

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
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

  function handleExportCsv() {
    const { revenueData, kpis, appointmentTypes } = analyticsData;

    // Revenue rows
    const rows: Record<string, unknown>[] = revenueData.map((row) => ({
      Month: row.month,
      Revenue: row.revenue.toFixed(2),
      Sessions: row.count,
    }));

    // Appointment type rows
    for (const item of appointmentTypes) {
      rows.push({
        Month: `[Type] ${item.type}`,
        Revenue: '',
        Sessions: item.count,
      });
    }

    // KPI summary row
    rows.push({
      Month: '[KPI Summary]',
      Revenue: '',
      Sessions: '',
    });
    rows.push({
      Month: 'CLV',
      Revenue: kpis.clv.toFixed(2),
      Sessions: '',
    });
    rows.push({
      Month: 'No-Show Rate',
      Revenue: `${kpis.noShowRate.toFixed(1)}%`,
      Sessions: '',
    });
    rows.push({
      Month: 'Avg Session Duration',
      Revenue: `${kpis.avgSessionDuration.toFixed(1)}h`,
      Sessions: '',
    });

    exportToCsv('analytics-report.csv', rows);
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

      {/* Charts */}
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
    </div>
  );
}
