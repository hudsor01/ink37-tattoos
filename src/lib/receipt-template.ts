/**
 * HTML receipt template for payment PDF generation via Stirling PDF.
 * All user-input fields are HTML-escaped to prevent injection.
 */
import { format } from 'date-fns';

/**
 * Escape HTML special characters to prevent HTML/script injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReceiptData {
  studioName: string;
  customerName: string;
  customerEmail?: string;
  sessionDescription: string;
  sessionDate?: Date;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  receiptNumber: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Render a complete HTML receipt for conversion to PDF.
 * User-input fields are escaped before interpolation.
 */
export function renderReceiptHtml(data: ReceiptData): string {
  const safeName = escapeHtml(data.customerName);
  const safeEmail = data.customerEmail ? escapeHtml(data.customerEmail) : null;
  const safeDescription = escapeHtml(data.sessionDescription);
  const safeMethod = escapeHtml(data.paymentMethod);
  const safeStudio = escapeHtml(data.studioName);
  const safeReceipt = escapeHtml(data.receiptNumber);

  const formattedAmount = currencyFormatter.format(Number(data.amount));
  const formattedPaymentDate = format(data.paymentDate, 'MMMM d, yyyy');
  const formattedSessionDate = data.sessionDate
    ? format(data.sessionDate, 'MMMM d, yyyy')
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${safeReceipt}</title>
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
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e5e5e5;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .header .receipt-number {
      font-size: 14px;
      color: #666666;
    }
    .details {
      margin-bottom: 32px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    .detail-row .label {
      color: #666666;
      font-weight: 500;
    }
    .detail-row .value {
      color: #1a1a1a;
      text-align: right;
      max-width: 60%;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      border-top: 2px solid #1a1a1a;
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      font-size: 13px;
      color: #999999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${safeStudio}</h1>
    <div class="receipt-number">${safeReceipt}</div>
  </div>

  <div class="details">
    <div class="detail-row">
      <span class="label">Customer</span>
      <span class="value">${safeName}${safeEmail ? ` (${safeEmail})` : ''}</span>
    </div>
    <div class="detail-row">
      <span class="label">Service</span>
      <span class="value">${safeDescription}</span>
    </div>${formattedSessionDate ? `
    <div class="detail-row">
      <span class="label">Session Date</span>
      <span class="value">${formattedSessionDate}</span>
    </div>` : ''}
    <div class="detail-row">
      <span class="label">Payment Date</span>
      <span class="value">${formattedPaymentDate}</span>
    </div>
    <div class="detail-row">
      <span class="label">Payment Method</span>
      <span class="value">${safeMethod}</span>
    </div>
  </div>

  <div class="total-row">
    <span>Total</span>
    <span>${formattedAmount}</span>
  </div>

  <div class="footer">
    Thank you for your business!
  </div>
</body>
</html>`;
}
