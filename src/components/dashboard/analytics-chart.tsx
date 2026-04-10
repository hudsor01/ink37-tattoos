'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { formatDistance } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

const CHART_COLORS = [
  'hsl(var(--chart-1, 220 70% 50%))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
  'hsl(var(--chart-6, 200 80% 45%))',
  'hsl(var(--chart-7, 100 60% 40%))',
];

// Revenue Area Chart
interface RevenueChartProps {
  data: { month: string; revenue: number; count: number }[];
}

const revenueConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1, 220 70% 50%))',
  },
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <figure role="img" aria-label={`Revenue chart showing ${data.length} months of data`}>
      <ChartContainer config={revenueConfig} className="min-h-chart w-full">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              const date = new Date(Number(year), Number(month) - 1);
              return date.toLocaleDateString('en-US', { month: 'short' });
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              `$${(value as number).toLocaleString()}`
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  name === 'revenue'
                    ? `$${(value as number).toLocaleString()}`
                    : `${value} sessions`
                }
              />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-revenue)"
            fill="var(--color-revenue)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Revenue by month: {data.map(d => `${d.month}: $${d.revenue.toLocaleString()}`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Appointment Type Pie Chart
interface AppointmentTypeChartProps {
  data: { type: string; count: number }[];
}

export function AppointmentTypeChart({ data }: AppointmentTypeChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.type,
      {
        label: item.type.replace(/_/g, ' '),
        color: CHART_COLORS[i % CHART_COLORS.length],
      },
    ])
  );

  return (
    <figure role="img" aria-label={`Appointment types breakdown: ${data.map(d => d.type.replace(/_/g, ' ')).join(', ')}`}>
      <ChartContainer config={config} className="min-h-chart w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="type" />} />
        </PieChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Appointment types: {data.map(d => `${d.type.replace(/_/g, ' ')}: ${d.count}`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Client Acquisition Bar Chart
interface ClientAcquisitionChartProps {
  data: { month: string; count: number }[];
}

const acquisitionConfig: ChartConfig = {
  count: {
    label: 'New Clients',
    color: 'hsl(var(--chart-2, 160 60% 45%))',
  },
};

export function ClientAcquisitionChart({ data }: ClientAcquisitionChartProps) {
  return (
    <figure role="img" aria-label={`Client acquisition over ${data.length} months`}>
      <ChartContainer config={acquisitionConfig} className="min-h-chart w-full">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              const date = new Date(Number(year), Number(month) - 1);
              return date.toLocaleDateString('en-US', { month: 'short' });
            }}
          />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip
            content={<ChartTooltipContent />}
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        New clients by month: {data.map(d => `${d.month}: ${d.count}`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Revenue Composed Chart — dual Y-axis with revenue bars + session count line
interface RevenueComposedChartProps {
  data: { month: string; revenue: number; count: number }[];
}

const composedConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-1, 220 70% 50%))' },
  count: { label: 'Sessions', color: 'hsl(var(--chart-2, 160 60% 45%))' },
};

function formatMonth(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function RevenueComposedChart({ data }: RevenueComposedChartProps) {
  return (
    <figure role="img" aria-label={`Revenue and session count over ${data.length} months`}>
      <ChartContainer config={composedConfig} className="min-h-chart-lg w-full">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatMonth}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value as number).toLocaleString()}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  name === 'revenue'
                    ? `$${(value as number).toLocaleString()}`
                    : `${value} sessions`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            fill="var(--color-revenue)"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="count"
            stroke="var(--color-count)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-count)' }}
          />
          {data.length > 6 && (
            <Brush dataKey="month" height={30} stroke="hsl(var(--primary))" tickFormatter={formatMonth} />
          )}
        </ComposedChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Revenue and sessions by month: {data.map(d => `${d.month}: $${d.revenue.toLocaleString()}, ${d.count} sessions`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Booking Trends LineChart — bookings vs cancellations over time
interface BookingTrendsChartProps {
  data: { week: string; bookings: number; cancellations: number }[];
}

const trendsConfig: ChartConfig = {
  bookings: { label: 'Bookings', color: 'hsl(var(--chart-1, 220 70% 50%))' },
  cancellations: { label: 'Cancellations', color: 'hsl(var(--destructive, 0 84% 60%))' },
};

export function BookingTrendsChart({ data }: BookingTrendsChartProps) {
  return (
    <figure role="img" aria-label={`Booking trends over ${data.length} weeks`}>
      <ChartContainer config={trendsConfig} className="min-h-chart w-full">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="bookings"
            stroke="var(--color-bookings)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-bookings)' }}
          />
          <Line
            type="monotone"
            dataKey="cancellations"
            stroke="var(--color-cancellations)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: 'var(--color-cancellations)' }}
          />
        </LineChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Booking trends by week: {data.map(d => `${d.week}: ${d.bookings} bookings, ${d.cancellations} cancellations`).join(', ')}
      </figcaption>
    </figure>
  );
}

// ============================================================================
// ANALYTICS DEPTH: Revenue Vertical (ANLYT-01)
// ============================================================================

// Revenue by Style — Horizontal Bar Chart
interface RevenueByStyleChartProps {
  data: { style: string; revenue: number; count: number }[];
}

const revenueByStyleConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: CHART_COLORS[0],
  },
};

export function RevenueByStyleChart({ data }: RevenueByStyleChartProps) {
  return (
    <figure role="img" aria-label={`Revenue by tattoo style: ${data.length} styles`}>
      <ChartContainer config={revenueByStyleConfig} className="min-h-chart w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value as number).toLocaleString()}`}
          />
          <YAxis
            type="category"
            dataKey="style"
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) =>
                  `$${(value as number).toLocaleString()} (${(item as { payload?: { count?: number } }).payload?.count ?? 0} sessions)`
                }
              />
            }
          />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Revenue by style: {data.map(d => `${d.style}: $${d.revenue.toLocaleString()} (${d.count} sessions)`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Revenue by Size — Donut Pie Chart
interface RevenueBySizeChartProps {
  data: { size: string; revenue: number; count: number }[];
}

export function RevenueBySizeChart({ data }: RevenueBySizeChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.size,
      {
        label: item.size.replace(/_/g, ' '),
        color: CHART_COLORS[i % CHART_COLORS.length],
      },
    ])
  );

  return (
    <figure role="img" aria-label={`Revenue distribution by tattoo size: ${data.map(d => d.size).join(', ')}`}>
      <ChartContainer config={config} className="min-h-chart w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) =>
                  `$${(value as number).toLocaleString()} (${(item as { payload?: { count?: number } }).payload?.count ?? 0} sessions)`
                }
                nameKey="size"
              />
            }
          />
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="size"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-size-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="size" />} />
        </PieChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Revenue by size: {data.map(d => `${d.size}: $${d.revenue.toLocaleString()}`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Payment Rates — Pie Chart
interface PaymentRatesChartProps {
  data: { total: number; successRate: number; refundRate: number; failureRate: number };
}

const paymentRatesConfig: ChartConfig = {
  success: { label: 'Success', color: 'hsl(var(--chart-2, 160 60% 45%))' },
  refund: { label: 'Refund', color: 'hsl(var(--chart-3, 30 80% 55%))' },
  failed: { label: 'Failed', color: 'hsl(var(--destructive, 0 84% 60%))' },
};

export function PaymentRatesChart({ data }: PaymentRatesChartProps) {
  const chartData = [
    { name: 'Success', value: data.successRate, fill: 'hsl(var(--chart-2, 160 60% 45%))' },
    { name: 'Refund', value: data.refundRate, fill: 'hsl(var(--chart-3, 30 80% 55%))' },
    { name: 'Failed', value: data.failureRate, fill: 'hsl(var(--destructive, 0 84% 60%))' },
  ];

  return (
    <figure role="img" aria-label={`Payment rates: ${data.successRate}% success, ${data.refundRate}% refund, ${data.failureRate}% failed`}>
      <ChartContainer config={paymentRatesConfig} className="min-h-chart w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => `${value}%`}
                nameKey="name"
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-payment-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Payment rates out of {data.total} payments: {data.successRate}% success, {data.refundRate}% refund, {data.failureRate}% failed
      </figcaption>
    </figure>
  );
}

// ============================================================================
// ANALYTICS DEPTH: Booking Vertical (ANLYT-02)
// ============================================================================

// Booking Funnel — FunnelChart
interface BookingFunnelChartProps {
  data: { stage: string; value: number; fill: string }[];
}

export function BookingFunnelChart({ data }: BookingFunnelChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [
      item.stage,
      {
        label: item.stage,
        color: item.fill,
      },
    ])
  );

  return (
    <figure role="img" aria-label={`Booking funnel: ${data.map(d => `${d.stage} (${d.value})`).join(' > ')}`}>
      <ChartContainer config={config} className="min-h-chart w-full">
        <FunnelChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" dataKey="stage" fill="#000" className="fill-foreground text-sm" />
            <LabelList position="center" dataKey="value" fill="#fff" className="fill-white font-bold" />
          </Funnel>
        </FunnelChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Booking funnel stages: {data.map(d => `${d.stage}: ${d.value}`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Peak Hours Heatmap — CSS Grid (no Recharts)
interface PeakHoursHeatmapProps {
  data: { hour: number; count: number }[];
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const dataMap = new Map(data.map(d => [d.hour, d.count]));

  // Show business hours 8-20 plus any hours with data outside that range
  const hours: number[] = [];
  for (let h = 0; h < 24; h++) {
    if ((h >= 8 && h <= 20) || dataMap.has(h)) {
      hours.push(h);
    }
  }

  return (
    <figure role="img" aria-label={`Peak appointment hours heatmap showing ${data.length} hours with bookings`}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(hours.length, 13)}, minmax(0, 1fr))` }}>
        {hours.map((hour) => {
          const count = dataMap.get(hour) ?? 0;
          const intensity = count > 0 ? 100 - (count / maxCount) * 50 : 95;
          return (
            <div key={hour} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{formatHour(hour)}</span>
              <div
                className="flex h-12 w-full items-center justify-center rounded text-xs font-medium"
                style={{
                  backgroundColor: count > 0
                    ? `hsl(220, 70%, ${intensity}%)`
                    : 'hsl(220, 10%, 95%)',
                  color: intensity < 70 ? 'white' : 'inherit',
                }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">
        Peak hours: {data.map(d => `${formatHour(d.hour)}: ${d.count} appointments`).join(', ')}
      </figcaption>
    </figure>
  );
}

// ============================================================================
// ANALYTICS DEPTH: Customer Vertical (ANLYT-03)
// ============================================================================

// Customer CLV — Horizontal Bar Chart
interface CustomerCLVChartProps {
  data: { customerId: string; name: string; clv: number; sessions: number }[];
}

const clvConfig: ChartConfig = {
  clv: {
    label: 'CLV',
    color: CHART_COLORS[0],
  },
};

export function CustomerCLVChart({ data }: CustomerCLVChartProps) {
  const topData = data.slice(0, 10);

  return (
    <figure role="img" aria-label={`Top ${topData.length} customers by lifetime value`}>
      <ChartContainer config={clvConfig} className="min-h-chart-lg w-full">
        <BarChart data={topData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${(value as number).toLocaleString()}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) =>
                  `$${(value as number).toLocaleString()} (${(item as { payload?: { sessions?: number } }).payload?.sessions ?? 0} sessions)`
                }
              />
            }
          />
          <Bar dataKey="clv" fill="var(--color-clv)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Top customers by CLV: {topData.map(d => `${d.name}: $${d.clv.toLocaleString()} (${d.sessions} sessions)`).join(', ')}
      </figcaption>
    </figure>
  );
}

// Churn Risk Table — HTML Table
interface ChurnRiskTableProps {
  data: { customerId: string; name: string; email: string | null; lastActivity: Date | null }[];
}

export function ChurnRiskTable({ data }: ChurnRiskTableProps) {
  const enrichedData = useMemo(
    () => {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      return data.map((row) => {
        const daysInactive = row.lastActivity
          ? Math.floor((now - new Date(row.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const colorClass = daysInactive === null
          ? 'text-red-600'
          : daysInactive > 180
            ? 'text-red-600'
            : daysInactive > 90
              ? 'text-amber-600'
              : 'text-foreground';
        return { ...row, daysInactive, colorClass };
      });
    },
    [data],
  );

  return (
    <figure role="img" aria-label={`Churn risk table showing ${data.length} at-risk customers`}>
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Email</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Last Activity</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Days Inactive</th>
            </tr>
          </thead>
          <tbody>
            {enrichedData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No at-risk customers found
                </td>
              </tr>
            ) : (
              enrichedData.map((row) => (
                <tr key={row.customerId} className="border-b last:border-0">
                  <td className={`px-3 py-2 ${row.colorClass}`}>{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.email ?? '-'}</td>
                  <td className={`px-3 py-2 ${row.colorClass}`}>
                    {row.lastActivity
                      ? formatDistance(new Date(row.lastActivity), new Date(), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className={`px-3 py-2 font-medium ${row.colorClass}`}>
                    {row.daysInactive !== null ? row.daysInactive : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <figcaption className="sr-only">
        At-risk customers: {data.map(d => `${d.name} (${d.lastActivity ? `last active ${formatDistance(new Date(d.lastActivity), new Date(), { addSuffix: true })}` : 'never active'})`).join(', ')}
      </figcaption>
    </figure>
  );
}

// ============================================================================
// ANALYTICS DEPTH: Operational Vertical (ANLYT-04)
// ============================================================================

// Duration by Type — Vertical Bar Chart
interface DurationByTypeChartProps {
  data: { type: string; avgDuration: number; count: number }[];
}

const durationConfig: ChartConfig = {
  avgDuration: {
    label: 'Avg Duration',
    color: CHART_COLORS[3],
  },
};

export function DurationByTypeChart({ data }: DurationByTypeChartProps) {
  return (
    <figure role="img" aria-label={`Average session duration by type for ${data.length} styles`}>
      <ChartContainer config={durationConfig} className="min-h-chart w-full">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="type"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) =>
                  `${Number(value).toFixed(1)}h avg (${(item as { payload?: { count?: number } }).payload?.count ?? 0} sessions)`
                }
              />
            }
          />
          <Bar dataKey="avgDuration" fill="var(--color-avgDuration)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Duration by type: {data.map(d => `${d.type}: ${d.avgDuration.toFixed(1)}h avg (${d.count} sessions)`).join(', ')}
      </figcaption>
    </figure>
  );
}

// No-Show Trends — ComposedChart with dual Y-axis
interface NoShowTrendsChartProps {
  data: { month: string; total: number; noShows: number; rate: number }[];
}

const noShowConfig: ChartConfig = {
  total: { label: 'Appointments', color: CHART_COLORS[0] },
  rate: { label: 'No-Show Rate', color: 'hsl(var(--destructive, 0 84% 60%))' },
};

export function NoShowTrendsChart({ data }: NoShowTrendsChartProps) {
  return (
    <figure role="img" aria-label={`No-show trends over ${data.length} months`}>
      <ChartContainer config={noShowConfig} className="min-h-chart-lg w-full">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              const date = new Date(Number(year), Number(month) - 1);
              return date.toLocaleDateString('en-US', { month: 'short' });
            }}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  name === 'rate'
                    ? `${value}%`
                    : `${value} appointments`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            yAxisId="left"
            dataKey="total"
            fill="var(--color-total)"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rate"
            stroke="var(--color-rate)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-rate)' }}
          />
        </ComposedChart>
      </ChartContainer>
      <figcaption className="sr-only">
        No-show trends: {data.map(d => `${d.month}: ${d.total} appointments, ${d.noShows} no-shows (${d.rate}%)`).join(', ')}
      </figcaption>
    </figure>
  );
}
