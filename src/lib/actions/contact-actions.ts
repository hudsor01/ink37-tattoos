'use server';

import { z } from 'zod';
import { ContactFormSchema } from '@/lib/security/validation';
import { rateLimit } from '@/lib/security/rate-limiter';
import { createContact, updateContact, deleteContact } from '@/lib/dal/contacts';
import { sendContactNotification } from '@/lib/email/resend';
import { logAudit } from '@/lib/dal/audit';
import { createNotificationForAdmins } from '@/lib/dal/notifications';
import { getCurrentSession } from '@/lib/auth';
import { createLogger } from '@/lib/logger';
import { after } from 'next/server';

const log = createLogger('contact-actions');
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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
      log.error({ err }, 'Contact email notification failed')
    );

    // Notification: inform admins of new contact submission
    try {
      await createNotificationForAdmins({
        type: 'CONTACT',
        title: 'New Contact Submission',
        message: `${result.data.name} submitted a contact form`,
        metadata: { contactName: result.data.name, contactEmail: result.data.email },
      });
    } catch (err) {
      log.error({ err }, 'Failed to create contact notification');
    }

    return { success: true as const };
  } catch (error) {
    log.error({ err: error }, 'Contact form submission failed');
    return {
      success: false as const,
      error: 'Something went wrong. Please try again.',
    };
  }
}

const UpdateNotesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer'),
});

export async function updateContactNotesAction(
  id: string,
  notes: string
): Promise<ActionResult<void>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const parsed = UpdateNotesSchema.safeParse({ id, notes });
  if (!parsed.success) {
    return { success: false, error: 'Validation failed' };
  }

  try {
    await updateContact(id, { adminNotes: notes });

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'contact',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { field: 'adminNotes' },
      })
    );

    revalidatePath('/dashboard/contacts');
    return { success: true, data: undefined };
  } catch (error) {
    log.error({ err: error }, 'Update contact notes failed');
    return { success: false, error: 'Failed to update notes' };
  }
}

export async function deleteContactAction(
  id: string
): Promise<ActionResult<void>> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  try {
    // deleteContact returns the deleted record for audit metadata
    const deleted = await deleteContact(id);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'DELETE',
        resource: 'contact',
        resourceId: id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { contactName: deleted.name, contactEmail: deleted.email },
      })
    );

    revalidatePath('/dashboard/contacts');
    return { success: true, data: undefined };
  } catch (error) {
    log.error({ err: error }, 'Delete contact failed');
    return { success: false, error: 'Failed to delete contact' };
  }
}
