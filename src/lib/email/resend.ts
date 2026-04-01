import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  contactAdminTemplate,
  contactConfirmationTemplate,
  passwordResetTemplate,
  paymentRequestTemplate,
  orderConfirmationTemplate,
  giftCardDeliveryTemplate,
  giftCardPurchaseConfirmationTemplate,
  aftercareTemplate,
  balanceDueReminderTemplate,
  noShowFollowUpTemplate,
  invoiceEmailTemplate,
} from './templates';

const getResend = () => new Resend(env().RESEND_API_KEY ?? '');
const FROM_EMAIL = 'Ink 37 Tattoos <noreply@ink37tattoos.com>';

export async function sendPasswordResetEmail(data: {
  to: string;
  url: string;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping password reset email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Reset Your Password - Ink 37 Tattoos',
    html: passwordResetTemplate({ url: data.url }),
    headers: {
      'X-Entity-Ref-ID': `password-reset-${Date.now()}`,
    },
  });

  return { sent: !!result.data?.id };
}

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const adminEmail = env().ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn('ADMIN_EMAIL not configured -- skipping admin notification');
    return { adminSent: false, customerSent: false };
  }

  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping email notifications');
    return { adminSent: false, customerSent: false };
  }

  // Use batch send for a single API call instead of two separate requests
  const { data: batchResult, error } = await getResend().batch.send([
    {
      from: FROM_EMAIL,
      to: adminEmail,
      replyTo: data.email,
      subject: `New Contact: ${data.name}`,
      html: contactAdminTemplate(data),
    },
    {
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Thank you for contacting Ink 37 Tattoos',
      html: contactConfirmationTemplate(data.name),
    },
  ]);

  if (error) {
    logger.error({ err: error }, 'Email batch send failed');
    return { adminSent: false, customerSent: false };
  }

  return {
    adminSent: !!batchResult?.data?.[0]?.id,
    customerSent: !!batchResult?.data?.[1]?.id,
  };
}

export async function sendPaymentRequestEmail(data: {
  to: string;
  customerName: string;
  amount: number;
  type: 'deposit' | 'balance';
  paymentUrl: string;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping payment request email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Payment Request - ${data.type === 'deposit' ? 'Deposit' : 'Session Balance'} - Ink 37 Tattoos`,
    html: paymentRequestTemplate(data),
    headers: {
      'X-Entity-Ref-ID': `payment-${data.type}-${Date.now()}`,
    },
  });

  return { sent: !!result.data?.id };
}

export async function sendOrderConfirmationEmail(data: {
  to: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  hasDigitalItems: boolean;
  downloadLinks?: Array<{ name: string; url: string }>;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping order confirmation email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Order Confirmation - Ink 37 Tattoos',
    html: orderConfirmationTemplate({ email: data.to, ...data }),
    headers: {
      'X-Entity-Ref-ID': `order-${data.orderId}`,
    },
  });

  return { sent: !!result.data?.id };
}

export async function sendGiftCardEmail(data: {
  to: string;
  recipientName: string;
  senderName: string;
  amount: number;
  code: string;
  personalMessage?: string;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping gift card email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: "You've received an Ink 37 Gift Card!",
    html: giftCardDeliveryTemplate(data),
  });

  return { sent: !!result.data?.id };
}

export async function sendGiftCardPurchaseConfirmationEmail(data: {
  to: string;
  amount: number;
  recipientName: string;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping gift card purchase confirmation email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Gift Card Purchase Confirmation - Ink 37 Tattoos',
    html: giftCardPurchaseConfirmationTemplate(data),
  });

  return { sent: !!result.data?.id };
}

export async function sendAftercareEmail(data: {
  to: string;
  customerName: string;
  sessionDate: string;
  placement: string;
  template?: string;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping aftercare email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Aftercare Instructions - Ink 37 Tattoos',
    html: aftercareTemplate(data),
    headers: {
      'X-Entity-Ref-ID': `aftercare-${Date.now()}`,
    },
  });

  return { sent: !!result.data?.id };
}

export async function sendBalanceDueReminder(data: {
  to: string;
  customerName: string;
  designDescription: string;
  totalCost: number;
  paidAmount: number;
  remainingBalance: number;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping balance due reminder email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Balance Due Reminder - Ink 37 Tattoos',
    html: balanceDueReminderTemplate(data),
    headers: {
      'X-Entity-Ref-ID': `balance-due-${Date.now()}`,
    },
  });

  return { sent: !!result.data?.id };
}

export async function sendNoShowFollowUp(data: {
  to: string;
  customerName: string;
  appointmentDate: string;
  appointmentType: string;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping no-show follow-up email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'We missed you - Ink 37 Tattoos',
    html: noShowFollowUpTemplate(data),
    headers: {
      'X-Entity-Ref-ID': `no-show-${Date.now()}`,
    },
  });

  return { sent: !!result.data?.id };
}

export async function sendInvoiceEmail(data: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  totalDue: number;
  pdfBuffer: Buffer;
}): Promise<{ sent: boolean }> {
  if (!env().RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured -- skipping invoice email');
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Invoice ${data.invoiceNumber} - Ink 37 Tattoos`,
    html: invoiceEmailTemplate(data),
    attachments: [
      {
        filename: `invoice-${data.invoiceNumber}.pdf`,
        content: data.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
    headers: {
      'X-Entity-Ref-ID': `invoice-${data.invoiceNumber}`,
    },
  });

  return { sent: !!result.data?.id };
}
