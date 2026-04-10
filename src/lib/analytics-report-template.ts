/**
 * HTML analytics report template for PDF generation via Stirling PDF.
 * Uses only static HTML tables and CSS-based inline bars (no JS charts).
 * All user-input fields are HTML-escaped to prevent injection.
 */
import { format } from 'date-fns';
import { escapeHtml } from '@/lib/receipt-template';
import type { AnalyticsKPIs, ComparisonData } from '@/lib/dal/analytics';

export interface AnalyticsReportData {
  from: Date;
  to: Date;
  kpis: AnalyticsKPIs;
  comparison?: ComparisonData | null;
  revenueData: { month: string; revenue: number; count: number }[];
  appointmentTypes: { type: string; count: number }[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatTrend(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function renderAnalyticsReportHtml(data: AnalyticsReportData): string {
  const fromStr = escapeHtml(format(data.from, 'MMMM d, yyyy'));
  const toStr = escapeHtml(format(data.to, 'MMMM d, yyyy'));
  const generatedAt = escapeHtml(format(new Date(), 'MMMM d, yyyy h:mm a'));

  // Revenue data for bars
  const maxRevenue = Math.max(...data.revenueData.map((d) => d.revenue), 1);

  // Appointment type totals for percentages
  const totalAppointments = data.appointmentTypes.reduce((acc, t) => acc + t.count, 0);

  // KPI section
  const clvFormatted = currencyFormatter.format(data.kpis.clv);
  const noShowFormatted = `${data.kpis.noShowRate.toFixed(1)}%`;
  const durationFormatted = `${data.kpis.avgSessionDuration.toFixed(1)}h`;

  // Trend strings
  const clvTrend = data.comparison ? formatTrend(data.comparison.trends.clvTrend) : '';
  const noShowTrend = data.comparison ? formatTrend(data.comparison.trends.noShowRateTrend) : '';
  const durationTrend = data.comparison ? formatTrend(data.comparison.trends.avgSessionDurationTrend) : '';

  // Revenue sparkline data
  const sparklineMaxHeight = 40;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      font-size: 14px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 13px;
      color: #666666;
    }
    .header .date-range {
      font-size: 15px;
      font-weight: 600;
      color: #333333;
      margin-top: 8px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
      margin-top: 28px;
      color: #1a1a1a;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 6px;
    }

    /* KPI Table */
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .kpi-table th {
      text-align: center;
      padding: 10px 16px;
      background: #f8f9fa;
      font-size: 12px;
      color: #666666;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e5e5;
    }
    .kpi-table td {
      text-align: center;
      padding: 14px 16px;
      border-bottom: 1px solid #f0f0f0;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .kpi-trend {
      font-size: 12px;
      margin-top: 2px;
    }
    .kpi-trend.positive { color: #16a34a; }
    .kpi-trend.negative { color: #dc2626; }

    /* Revenue Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .data-table th {
      text-align: left;
      padding: 8px 12px;
      background: #f8f9fa;
      font-size: 12px;
      font-weight: 600;
      color: #666666;
      border-bottom: 2px solid #e5e5e5;
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .data-table tr:nth-child(even) {
      background: #fafafa;
    }
    .data-table .number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* CSS inline bar */
    .bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bar {
      height: 8px;
      border-radius: 4px;
      background: #3b82f6;
      display: inline-block;
    }

    /* CSS-only sparkline */
    .sparkline {
      display: flex;
      align-items: flex-end;
      gap: 1px;
      height: ${sparklineMaxHeight}px;
      margin: 12px 0;
    }
    .sparkline-bar {
      display: inline-block;
      width: 8px;
      background: #3b82f6;
      border-radius: 2px 2px 0 0;
      vertical-align: bottom;
    }

    /* Appointment breakdown */
    .type-bar {
      height: 8px;
      border-radius: 4px;
      background: #6366f1;
      display: inline-block;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #999999;
    }
    .footer .note {
      font-style: italic;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ink37 Tattoos</h1>
    <div class="subtitle">Analytics Report</div>
    <div class="date-range">${fromStr} - ${toStr}</div>
  </div>

  <!-- KPI Summary -->
  <div class="section-title">Key Performance Indicators</div>
  <table class="kpi-table">
    <thead>
      <tr>
        <th>Customer Lifetime Value</th>
        <th>No-Show Rate</th>
        <th>Avg Session Duration</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="kpi-value">${clvFormatted}</div>
          ${clvTrend ? `<div class="kpi-trend ${data.comparison && data.comparison.trends.clvTrend >= 0 ? 'positive' : 'negative'}">${clvTrend} vs prev period</div>` : ''}
        </td>
        <td>
          <div class="kpi-value">${noShowFormatted}</div>
          ${noShowTrend ? `<div class="kpi-trend ${data.comparison && data.comparison.trends.noShowRateTrend <= 0 ? 'positive' : 'negative'}">${noShowTrend} vs prev period</div>` : ''}
        </td>
        <td>
          <div class="kpi-value">${durationFormatted}</div>
          ${durationTrend ? `<div class="kpi-trend ${data.comparison && data.comparison.trends.avgSessionDurationTrend >= 0 ? 'positive' : 'negative'}">${durationTrend} vs prev period</div>` : ''}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Revenue Sparkline -->
  ${data.revenueData.length > 0 ? `
  <div class="section-title">Monthly Revenue Trend</div>
  <div class="sparkline">
    ${data.revenueData.map((d) => {
      const height = Math.max(2, (d.revenue / maxRevenue) * sparklineMaxHeight);
      return `<div class="sparkline-bar" style="height:${height}px;" title="${d.month}: ${currencyFormatter.format(d.revenue)}"></div>`;
    }).join('')}
  </div>
  ` : ''}

  <!-- Revenue by Month -->
  ${data.revenueData.length > 0 ? `
  <div class="section-title">Revenue by Month</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Month</th>
        <th>Revenue</th>
        <th>Sessions</th>
        <th style="width: 40%;">Revenue Distribution</th>
      </tr>
    </thead>
    <tbody>
      ${data.revenueData.map((d) => {
        const barWidth = Math.max(2, (d.revenue / maxRevenue) * 100);
        return `<tr>
        <td>${escapeHtml(d.month)}</td>
        <td class="number">${currencyFormatter.format(d.revenue)}</td>
        <td class="number">${d.count}</td>
        <td>
          <div class="bar-container">
            <div class="bar" style="width: ${barWidth}%;"></div>
          </div>
        </td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
  ` : '<p style="color: #999; text-align: center; padding: 20px;">No revenue data for this period.</p>'}

  <!-- Appointment Type Breakdown -->
  ${data.appointmentTypes.length > 0 ? `
  <div class="section-title">Appointment Type Breakdown</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Type</th>
        <th>Count</th>
        <th>Percentage</th>
        <th style="width: 35%;">Distribution</th>
      </tr>
    </thead>
    <tbody>
      ${data.appointmentTypes.map((t) => {
        const pct = totalAppointments > 0 ? ((t.count / totalAppointments) * 100) : 0;
        return `<tr>
        <td>${escapeHtml(t.type.replace(/_/g, ' '))}</td>
        <td class="number">${t.count}</td>
        <td class="number">${pct.toFixed(1)}%</td>
        <td>
          <div class="bar-container">
            <div class="type-bar" style="width: ${pct}%;"></div>
          </div>
        </td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    <div>Generated on ${generatedAt}</div>
    <div class="note">PDF export includes tabular data and CSS visualizations only. View interactive charts in the dashboard.</div>
  </div>
</body>
</html>`;
}
