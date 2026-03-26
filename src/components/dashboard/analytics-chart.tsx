'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  );
}
