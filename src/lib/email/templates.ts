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

export function giftCardPurchaseConfirmationTemplate(data: {
  amount: number;
  recipientName: string;
}): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.amount);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Gift Card Purchase Confirmation</h2>
      <p>Thank you for your Ink 37 Tattoos gift card purchase!</p>

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
            <td style="text-align: right;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Recipient:</td>
            <td style="text-align: right;">${data.recipientName}</td>
          </tr>
        </table>
      </div>

      <p>The gift card has been sent to the recipient's email address. They will receive it shortly with their unique redemption code.</p>

      <p style="color: #666; font-size: 14px;">If you have any questions, please don't hesitate to reach out.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}


// ============================================================================
// BUSINESS WORKFLOW TEMPLATES
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function aftercareTemplate(data: {
  customerName: string;
  sessionDate: string;
  placement: string;
  template?: string;
}): string {
  // If a configurable template is provided (from settings), use it with variable substitution
  if (data.template) {
    const rendered = data.template
      .replace(/\{name\}/g, escapeHtml(data.customerName))
      .replace(/\{date\}/g, escapeHtml(data.sessionDate))
      .replace(/\{placement\}/g, escapeHtml(data.placement));

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${rendered}
      </div>
    `;
  }

  // Default aftercare template
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Aftercare Instructions</h2>
      <p>Hello ${escapeHtml(data.customerName)},</p>
      <p>Thank you for your tattoo session on <strong>${escapeHtml(data.sessionDate)}</strong> (${escapeHtml(data.placement)}). Here are your aftercare instructions to ensure the best healing results:</p>

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <ol style="padding-left: 20px; line-height: 1.8;">
          <li><strong>Keep the bandage on for 2-4 hours</strong> after your session.</li>
          <li><strong>Wash gently</strong> with lukewarm water and unscented soap. Pat dry with a clean paper towel.</li>
          <li><strong>Apply a thin layer</strong> of recommended ointment (such as Aquaphor or fragrance-free lotion) 2-3 times daily.</li>
          <li><strong>Avoid sun exposure, swimming, and soaking</strong> (pools, hot tubs, baths) for at least 2 weeks.</li>
          <li><strong>Moisturize regularly</strong> once the initial healing phase is complete (usually after 3-5 days).</li>
          <li><strong>Do not pick or scratch</strong> at any scabbing or peeling skin.</li>
          <li><strong>Wear loose, breathable clothing</strong> over the tattooed area when possible.</li>
        </ol>
      </div>

      <p style="color: #666; font-size: 14px;">If you notice signs of infection (excessive redness, swelling, pus, or fever), please contact a healthcare provider immediately and let us know.</p>
      <p>If you have any questions about your healing process, don't hesitate to reach out.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}

export function balanceDueReminderTemplate(data: {
  customerName: string;
  designDescription: string;
  totalCost: number;
  paidAmount: number;
  remainingBalance: number;
}): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Balance Due Reminder</h2>
      <p>Hello ${escapeHtml(data.customerName)},</p>
      <p>This is a friendly reminder about the remaining balance for your tattoo session.</p>

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Design:</td>
            <td style="text-align: right;">${escapeHtml(data.designDescription)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Total Cost:</td>
            <td style="text-align: right;">${fmt(data.totalCost)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Amount Paid:</td>
            <td style="text-align: right;">${fmt(data.paidAmount)}</td>
          </tr>
          <tr style="border-top: 2px solid #1a1a1a;">
            <td style="padding: 8px 0; font-weight: bold; font-size: 18px;">Remaining Balance:</td>
            <td style="text-align: right; font-weight: bold; font-size: 18px;">${fmt(data.remainingBalance)}</td>
          </tr>
        </table>
      </div>

      <p>Please contact us to arrange payment at your earliest convenience. You can reply to this email or call the studio directly.</p>
      <p style="color: #666; font-size: 14px;">If you've already made this payment, please disregard this reminder.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}

export function noShowFollowUpTemplate(data: {
  customerName: string;
  appointmentDate: string;
  appointmentType: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">We Missed You!</h2>
      <p>Hello ${escapeHtml(data.customerName)},</p>
      <p>We noticed you weren't able to make your <strong>${escapeHtml(data.appointmentType)}</strong> appointment on <strong>${escapeHtml(data.appointmentDate)}</strong>.</p>

      <p>We understand that things come up, and we'd love to help you reschedule at a time that works better for you.</p>

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 0; font-weight: bold;">To reschedule, you can:</p>
        <ul style="padding-left: 20px; line-height: 1.8;">
          <li>Reply to this email with your preferred dates and times</li>
          <li>Book online through our website</li>
          <li>Call the studio directly</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px;">Please note that repeated no-shows may affect future booking availability. If you need to cancel, please let us know at least 24 hours in advance.</p>
      <p>We look forward to seeing you soon!</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}

export function invoiceEmailTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  totalDue: number;
}): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.totalDue);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Invoice ${escapeHtml(data.invoiceNumber)}</h2>
      <p>Hello ${escapeHtml(data.customerName)},</p>
      <p>Please find your invoice attached to this email.</p>

      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Invoice Number:</td>
            <td style="text-align: right;">${escapeHtml(data.invoiceNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Amount Due:</td>
            <td style="text-align: right; font-size: 18px; font-weight: bold;">${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}
