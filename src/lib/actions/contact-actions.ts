'use server';

import { ContactFormSchema } from '@/lib/security/validation';
import { rateLimit } from '@/lib/security/rate-limiter';
import { createContact } from '@/lib/dal/contacts';
import { sendContactNotification } from '@/lib/email/resend';
import { headers } from 'next/headers';

export async function submitContactForm(formData: FormData) {
  // Rate limiting: 5 requests per 15 minutes per IP
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? 'unknown';
  if (!rateLimit(ip, 5, 15 * 60 * 1000)) {
    return {
      success: false as const,
      error: 'Too many requests. Please try again in a few minutes.',
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
