'use server';

import { ContactFormSchema } from '@/lib/security/validation';
import { rateLimiters, getHeaderIp } from '@/lib/security/rate-limiter';
import { createContact } from '@/lib/dal/contacts';
import { logAudit } from '@/lib/dal/audit';
import { sendContactNotification } from '@/lib/email/resend';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';

export async function submitContactForm(formData: FormData): Promise<ActionResult<void>> {
  // Rate limiting: stays BEFORE safeAction (middleware-like)
  const hdrs = await headers();
  const ip = getHeaderIp(hdrs);
  const { success } = await rateLimiters.contact.limit(ip);
  if (!success) {
    return {
      success: false,
      error: 'Too many messages. Please try again later.',
    };
  }

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const validated = ContactFormSchema.parse(raw);

    // Store in database
    await createContact(validated);

    // Send email notifications (non-blocking for the response)
    sendContactNotification(validated).catch((err) =>
      console.error('Contact email notification failed:', err)
    );

    // Audit logging for public contact form (anonymous)
    after(() =>
      logAudit({
        userId: 'anonymous',
        action: 'CREATE',
        resource: 'contact',
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { email: validated.email, name: validated.name },
      })
    );
  });
}
