'use client';

import {
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

const PAYMENT_COLORS: Record<string, string> = {
  DEPOSIT: 'hsl(var(--chart-1, 220 70% 50%))',
  SESSION_BALANCE: 'hsl(var(--chart-2, 160 60% 45%))',
  REFUND: 'hsl(var(--chart-3, 30 80% 55%))',
};

/**
 * Default tax rate for financial reports.
 * Currently hardcoded -- no tax configuration exists in settings yet.
 * TODO: Make configurable via settings page in Phase 19/20.
 */
export const DEFAULT_TAX_RATE = 0;

// Payment Breakdown Pie Chart
interface PaymentBreakdownChartProps {
  data: { type: string; total: number; count: number }[];
}

function formatPaymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function PaymentBreakdownChart({ data }: PaymentBreakdownChartProps) {
  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [
      item.type,
      {
        label: formatPaymentType(item.type),
        color: PAYMENT_COLORS[item.type] ?? 'hsl(var(--chart-4, 280 65% 60%))',
      },
    ])
  );

  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <ChartContainer config={config} className="min-h-chart-lg w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="type"
              formatter={(value) => `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          }
        />
        <Pie
          data={data}
          dataKey="total"
          nameKey="type"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          label={(props) => {
            const { type, total: amount } = props as { type?: string; total?: number };
            const pct = total > 0 ? ((amount! / total) * 100).toFixed(1) : '0';
            return `${formatPaymentType(type ?? '')} ${pct}%`;
          }}
          labelLine={true}
        >
          {data.map((item) => (
            <Cell
              key={item.type}
              fill={PAYMENT_COLORS[item.type] ?? 'hsl(var(--chart-4, 280 65% 60%))'}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="type" />} />
      </PieChart>
    </ChartContainer>
  );
}

// Tax Summary Table
interface TaxSummaryTableProps {
  data: { month: string; revenue: number; count: number }[];
  taxRate: number;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function TaxSummaryTable({ data, taxRate }: TaxSummaryTableProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalTax = totalRevenue * taxRate;
  const totalNet = totalRevenue - totalTax;

  return (
    <div>
      {taxRate === 0 && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <strong>Tax not configured.</strong> Tax calculations show 0% rate. Configure a tax rate in settings to see accurate tax summaries.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-medium">Month</th>
              <th className="pb-2 pr-4 text-right font-medium">Revenue</th>
              <th className="pb-2 pr-4 text-right font-medium">Tax ({(taxRate * 100).toFixed(1)}%)</th>
              <th className="pb-2 text-right font-medium">Net Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const tax = row.revenue * taxRate;
              const net = row.revenue - tax;
              return (
                <tr key={row.month} className="border-b border-muted">
                  <td className="py-2 pr-4">{formatMonth(row.month)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(tax)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(net)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="pt-2 pr-4">Total</td>
              <td className="pt-2 pr-4 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
              <td className="pt-2 pr-4 text-right tabular-nums">{formatCurrency(totalTax)}</td>
              <td className="pt-2 text-right tabular-nums">{formatCurrency(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
