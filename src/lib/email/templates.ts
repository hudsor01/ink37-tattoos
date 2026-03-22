export function contactAdminTemplate(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold;">Name:</td><td>${data.name}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>${data.email}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${data.phone ?? 'N/A'}</td></tr>
      </table>
      <h3 style="color: #1a1a1a; margin-top: 24px;">Message:</h3>
      <p style="white-space: pre-wrap;">${data.message}</p>
    </div>
  `;
}

export function contactConfirmationTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Hello ${name},</h2>
      <p>Thank you for reaching out to Ink 37 Tattoos. We have received your message and will get back to you within 24 hours.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}

export function paymentRequestTemplate(data: {
  customerName: string;
  amount: number;
  type: 'deposit' | 'balance';
  paymentUrl: string;
  studioName?: string;
}): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.amount);

  const typeLabel = data.type === 'deposit' ? 'Deposit' : 'Session Balance';
  const studio = data.studioName ?? 'Ink 37 Tattoos';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Payment Request - ${typeLabel}</h2>
      <p>Hello ${data.customerName},</p>
      <p>A ${typeLabel.toLowerCase()} payment of <strong>${formattedAmount}</strong> has been requested for your tattoo session at ${studio}.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.paymentUrl}" style="background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Pay ${formattedAmount}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This payment link will expire in 24 hours. If you have any questions, please contact us.</p>
      <p>Best regards,<br>${studio}</p>
    </div>
  `;
}

export function orderConfirmationTemplate(data: {
  email: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  hasDigitalItems: boolean;
  downloadLinks?: Array<{ name: string; url: string }>;
}): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const itemRows = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${fmt(item.price)}</td>
        </tr>`
    )
    .join('');

  const downloadSection = data.hasDigitalItems && data.downloadLinks && data.downloadLinks.length > 0
    ? `<div style="background-color: #f0f9ff; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #1a1a1a;">Digital Downloads</p>
        <p style="margin: 0 0 12px 0;">Your digital items are ready for download:</p>
        ${data.downloadLinks.map((link) =>
          `<div style="margin: 8px 0;">
            <a href="${link.url}" style="color: #1a1a1a; text-decoration: underline; font-weight: 500;">${link.name}</a>
          </div>`
        ).join('')}
        <p style="color: #666; font-size: 12px; margin: 12px 0 0 0;">Links expire in 72 hours. Max 5 downloads per item.</p>
      </div>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Order Confirmation</h2>
      <p>Thank you for your order from Ink 37 Tattoos!</p>
      <p style="color: #666; font-size: 14px;">Order ID: ${data.orderId}</p>

      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #1a1a1a;">Item</th>
            <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #1a1a1a;">Qty</th>
            <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #1a1a1a;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table style="width: 100%; margin: 16px 0;">
        <tr><td style="padding: 4px 0;">Subtotal:</td><td style="text-align: right;">${fmt(data.subtotal)}</td></tr>
        ${data.shipping > 0 ? `<tr><td style="padding: 4px 0;">Shipping:</td><td style="text-align: right;">${fmt(data.shipping)}</td></tr>` : ''}
        ${data.discount > 0 ? `<tr><td style="padding: 4px 0; color: #16a34a;">Discount:</td><td style="text-align: right; color: #16a34a;">-${fmt(data.discount)}</td></tr>` : ''}
        <tr><td style="padding: 8px 0; font-weight: bold; border-top: 2px solid #1a1a1a;">Total:</td><td style="text-align: right; font-weight: bold; border-top: 2px solid #1a1a1a;">${fmt(data.total)}</td></tr>
      </table>

      ${downloadSection}

      <p style="color: #666; font-size: 14px;">If you have any questions about your order, please don't hesitate to reach out.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}

export function giftCardDeliveryTemplate(data: {
  recipientName: string;
  senderName: string;
  amount: number;
  code: string;
  personalMessage?: string;
}): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.amount);

  const messageSection = data.personalMessage
    ? `<div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #1a1a1a;">
        <p style="margin: 0; font-style: italic;">"${data.personalMessage}"</p>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">- ${data.senderName}</p>
      </div>`
    : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">You've received a gift card from ${data.senderName}!</h2>
      <p>Hello ${data.recipientName},</p>
      <p>${data.senderName} has sent you an Ink 37 Tattoos gift card worth <strong>${formattedAmount}</strong>.</p>

      ${messageSection}

      <div style="background-color: #1a1a1a; color: #ffffff; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.8;">Your Gift Card Code</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${data.code}</p>
        <p style="margin: 8px 0 0 0; font-size: 18px;">${formattedAmount}</p>
      </div>

      <p>Use this code at checkout in our online store or when booking a tattoo session.</p>
      <p style="color: #666; font-size: 14px;">Gift cards never expire.</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ink37tattoos.com'}/store" style="background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Visit Our Store
        </a>
      </div>

      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}
