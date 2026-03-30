/**
 * HTML invoice template for PDF generation via Stirling PDF.
 * All user-input fields are HTML-escaped to prevent injection.
 * Mirrors receipt-template.ts structure.
 */
import { format } from 'date-fns';
import { escapeHtml } from './receipt-template';

export interface InvoiceData {
  studioName: string;
  customerName: string;
  customerEmail?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  lineItems: Array<{ description: string; amount: number }>;
  subtotal: number;
  depositPaid: number;
  totalDue: number;
  terms?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Render a complete HTML invoice for conversion to PDF.
 * User-input fields are escaped before interpolation.
 */
export function renderInvoiceHtml(data: InvoiceData): string {
  const safeName = escapeHtml(data.customerName);
  const safeEmail = data.customerEmail ? escapeHtml(data.customerEmail) : null;
  const safeStudio = escapeHtml(data.studioName);
  const safeInvoiceNumber = escapeHtml(data.invoiceNumber);

  const formattedInvoiceDate = format(data.invoiceDate, 'MMMM d, yyyy');
  const formattedDueDate = format(data.dueDate, 'MMMM d, yyyy');

  const lineItemsHtml = data.lineItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
        ${escapeHtml(item.description)}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; text-align: right;">
        ${currencyFormatter.format(Number(item.amount))}
      </td>
    </tr>`
    )
    .join('');

  const depositRow =
    data.depositPaid > 0
      ? `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666666;">
        Deposit Paid
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; text-align: right; color: #22863a;">
        -${currencyFormatter.format(Number(data.depositPaid))}
      </td>
    </tr>`
      : '';

  const termsSection = data.terms
    ? `
  <div style="margin-top: 32px; padding: 16px; background: #f9f9f9; border-radius: 6px;">
    <h3 style="font-size: 13px; font-weight: 600; color: #666666; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Terms</h3>
    <p style="font-size: 13px; color: #333333; margin: 0; line-height: 1.5;">${escapeHtml(data.terms)}</p>
  </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${safeInvoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      padding: 40px;
      max-width: 600px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e5e5;">
    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">${safeStudio}</h1>
    <div style="font-size: 18px; font-weight: 600; color: #333333; margin-bottom: 8px;">INVOICE</div>
    <div style="font-size: 14px; color: #666666;">${safeInvoiceNumber}</div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
    <div>
      <div style="font-size: 12px; font-weight: 600; color: #999999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Bill To</div>
      <div style="font-size: 14px; font-weight: 500;">${safeName}</div>
      ${safeEmail ? `<div style="font-size: 13px; color: #666666;">${safeEmail}</div>` : ''}
    </div>
    <div style="text-align: right;">
      <div style="font-size: 13px; color: #666666; margin-bottom: 4px;">
        <span style="font-weight: 500;">Invoice Date:</span> ${formattedInvoiceDate}
      </div>
      <div style="font-size: 13px; color: #666666;">
        <span style="font-weight: 500;">Due Date:</span> ${formattedDueDate}
      </div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
    <thead>
      <tr>
        <th style="text-align: left; padding: 10px 0; border-bottom: 2px solid #e5e5e5; font-size: 12px; font-weight: 600; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
        <th style="text-align: right; padding: 10px 0; border-bottom: 2px solid #e5e5e5; font-size: 12px; font-weight: 600; color: #999999; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight: 500; color: #666666;">
          Subtotal
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; text-align: right;">
          ${currencyFormatter.format(Number(data.subtotal))}
        </td>
      </tr>
      ${depositRow}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; padding: 16px 0; border-top: 2px solid #1a1a1a; margin-top: 8px; font-size: 18px; font-weight: 700;">
    <span>Total Due</span>
    <span>${currencyFormatter.format(Number(data.totalDue))}</span>
  </div>

  ${termsSection}

  <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #999999;">
    Thank you for your business!<br>
    ${safeStudio} &bull; ink37tattoos.com
  </div>
</body>
</html>`;
}
