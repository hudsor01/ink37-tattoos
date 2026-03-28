'use client';

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
} from 'recharts';
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
      <ChartContainer config={revenueConfig} className="min-h-[250px] w-full">
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
      <ChartContainer config={config} className="min-h-[250px] w-full">
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
      <ChartContainer config={acquisitionConfig} className="min-h-[250px] w-full">
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
      <ChartContainer config={composedConfig} className="min-h-[300px] w-full">
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
      <ChartContainer config={trendsConfig} className="min-h-[250px] w-full">
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
