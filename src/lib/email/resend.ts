import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';
import {
  contactAdminTemplate,
  contactConfirmationTemplate,
  paymentRequestTemplate,
  orderConfirmationTemplate,
  giftCardDeliveryTemplate,
  giftCardPurchaseConfirmationTemplate,
} from './templates';

const getResend = () => new Resend(env().RESEND_API_KEY ?? '');
const FROM_EMAIL = 'Ink 37 Tattoos <noreply@ink37tattoos.com>';

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const adminEmail = env().ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn(
      'ADMIN_EMAIL not configured -- skipping admin notification'
    );
    return { adminSent: false, customerSent: false };
  }

  if (!env().RESEND_API_KEY) {
    console.warn(
      'RESEND_API_KEY not configured -- skipping email notifications'
    );
    return { adminSent: false, customerSent: false };
  }

  const [adminResult, customerResult] = await Promise.allSettled([
    getResend().emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      replyTo: data.email,
      subject: `New Contact: ${data.name}`,
      html: contactAdminTemplate(data),
    }),
    getResend().emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Thank you for contacting Ink 37 Tattoos',
      html: contactConfirmationTemplate(data.name),
    }),
  ]);

  return {
    adminSent: adminResult.status === 'fulfilled',
    customerSent: customerResult.status === 'fulfilled',
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
    console.warn(
      'RESEND_API_KEY not configured -- skipping payment request email'
    );
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Payment Request - ${data.type === 'deposit' ? 'Deposit' : 'Session Balance'} - Ink 37 Tattoos`,
    html: paymentRequestTemplate(data),
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
    console.warn(
      'RESEND_API_KEY not configured -- skipping order confirmation email'
    );
    return { sent: false };
  }

  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Order Confirmation - Ink 37 Tattoos',
    html: orderConfirmationTemplate({ email: data.to, ...data }),
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
    console.warn(
      'RESEND_API_KEY not configured -- skipping gift card email'
    );
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
    console.warn(
      'RESEND_API_KEY not configured -- skipping gift card purchase confirmation email'
    );
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
