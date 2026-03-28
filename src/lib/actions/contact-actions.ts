'use server';

import { ContactFormSchema } from '@/lib/security/validation';
import { rateLimiters, getHeaderIp } from '@/lib/security/rate-limiter';
import { createContact } from '@/lib/dal/contacts';
import { sendContactNotification } from '@/lib/email/resend';
import { headers } from 'next/headers';

export async function submitContactForm(formData: FormData) {
  // Rate limiting: 5 requests per minute per IP (persistent via Upstash)
  const hdrs = await headers();
  const ip = getHeaderIp(hdrs);
  const { success } = await rateLimiters.contact.limit(ip);
  if (!success) {
    return {
      success: false as const,
      error: 'Too many messages. Please try again later.',
    };
  }

  // Validate input
  const raw = Object.fromEntries(formData);
  const result = ContactFormSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false as const,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Store in database
    await createContact(result.data);

    // Send email notifications (non-blocking for the response)
    sendContactNotification(result.data).catch((err) =>
      console.error('Contact email notification failed:', err)
    );

    return { success: true as const };
  } catch (error) {
    console.error('Contact form submission failed:', error);
    return {
      success: false as const,
      error: 'Something went wrong. Please try again.',
    };
  }
}
