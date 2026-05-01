'use server';

import { requireRole } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { getPaymentWithDetails } from '@/lib/dal/payments';
import { getSettingByKey } from '@/lib/dal/settings';
import { renderInvoiceHtml } from '@/lib/invoice-template';
import { sendInvoiceEmail } from '@/lib/email/resend';
import { logAudit } from '@/lib/dal/audit';
import { createNotificationForAdmins } from '@/lib/dal/notifications';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

const STIRLING_PDF_URL = 'https://pdf.thehudsonfam.com/api/v1/convert/html/pdf';

/**
 * Email an invoice PDF to the customer for a completed payment.
 * CRITICAL: Generates PDF inline via renderInvoiceHtml() + direct Stirling PDF POST.
 * Does NOT fetch from the internal /api/invoices route (avoids auth forwarding
 * and cookie propagation issues in server actions).
 */
export async function emailInvoiceAction(
  paymentId: string
): Promise<ActionResult<{ sent: boolean }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    // Fetch payment with customer and session details
    const payment = await getPaymentWithDetails(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'COMPLETED') {
      throw new Error('Invoice can only be sent for completed payments');
    }

    // Require customer email
    const customerEmail = payment.customer?.email;
    if (!customerEmail) {
      throw new Error(
        'Customer does not have an email address on file. Please add an email before sending an invoice.'
      );
    }

    const customerName = payment.customer
      ? `${payment.customer.firstName} ${payment.customer.lastName}`
      : 'Unknown Customer';
    const sessionDescription =
      payment.tattooSession?.designDescription ?? 'Tattoo Session';
    const invoiceNumber = `INV-${paymentId.slice(0, 8).toUpperCase()}`;

    // Fetch invoice terms from settings. Falling back to a hardcoded
    // default on a real DB error is intentional (terms aren't critical
    // for invoice generation); but framework signals must still
    // propagate so a deeper unauthorized()/forbidden()/notFound()
    // doesn't get masked. The action is admin-gated upstream so this
    // is defense-in-depth, but the silent swallow shouldn't be a
    // safety property load-bearing on the upstream guard staying
    // admin-only.
    let terms = 'Payment received. Thank you.';
    try {
      const termsSetting = await getSettingByKey('invoice_terms');
      if (termsSetting?.value) {
        terms = String(termsSetting.value);
      }
    } catch (err) {
      if (isFrameworkSignal(err)) throw err;
      // fall through to default terms
    }

    // Build invoice HTML inline
    const html = renderInvoiceHtml({
      studioName: 'Ink37 Tattoos',
      customerName,
      customerEmail,
      invoiceNumber,
      invoiceDate: payment.completedAt ?? payment.createdAt,
      dueDate: payment.completedAt ?? payment.createdAt,
      lineItems: [{ description: sessionDescription, amount: payment.amount }],
      subtotal: payment.tattooSession?.totalCost ?? payment.amount,
      depositPaid: payment.tattooSession?.depositAmount ?? 0,
      totalDue: payment.amount,
      terms,
    });

    // Convert HTML to PDF via direct Stirling PDF POST (inline generation)
    const formData = new FormData();
    formData.append(
      'fileInput',
      new Blob([html], { type: 'text/html' }),
      'invoice.html'
    );
    formData.append('zoom', '1');

    const pdfResponse = await fetch(STIRLING_PDF_URL, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!pdfResponse.ok) {
      throw new Error(
        'PDF generation service is temporarily unavailable. Please try again later.'
      );
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // Send the invoice email with PDF attachment
    const { sent } = await sendInvoiceEmail({
      to: customerEmail,
      customerName,
      invoiceNumber,
      totalDue: payment.amount,
      pdfBuffer,
    });

    if (!sent) {
      throw new Error('Failed to send invoice email. Please check email configuration.');
    }

    // Audit log the email send (runs after response)
    const hdrs = await headers();
    after(() => {
      logAudit({
        userId: session.user.id,
        action: 'EMAIL_INVOICE',
        resource: 'payment',
        resourceId: paymentId,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: {
          invoiceNumber,
          customerEmail,
          totalDue: payment.amount,
        },
      });

      createNotificationForAdmins({
        type: 'PAYMENT',
        title: 'Invoice Emailed',
        message: `Invoice ${invoiceNumber} sent to ${customerName} (${customerEmail})`,
        metadata: { paymentId, invoiceNumber },
      });
    });

    revalidatePath('/dashboard/payments');

    return { sent: true };
  });
}
