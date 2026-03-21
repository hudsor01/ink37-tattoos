import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';
import {
  contactAdminTemplate,
  contactConfirmationTemplate,
} from './templates';

const resend = new Resend(env.RESEND_API_KEY ?? '');
const FROM_EMAIL = 'Ink 37 Tattoos <noreply@ink37tattoos.com>';

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn(
      'ADMIN_EMAIL not configured -- skipping admin notification'
    );
    return { adminSent: false, customerSent: false };
  }

  if (!env.RESEND_API_KEY) {
    console.warn(
      'RESEND_API_KEY not configured -- skipping email notifications'
    );
    return { adminSent: false, customerSent: false };
  }

  const [adminResult, customerResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      replyTo: data.email,
      subject: `New Contact: ${data.name}`,
      html: contactAdminTemplate(data),
    }),
    resend.emails.send({
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
