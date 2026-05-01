import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { getPaymentWithDetails } from '@/lib/dal/payments';
import { getSettingByKey } from '@/lib/dal/settings';
import { logger } from '@/lib/logger';
import { renderInvoiceHtml } from '@/lib/invoice-template';

const STIRLING_PDF_URL = 'https://pdf.thehudsonfam.com/api/v1/convert/html/pdf';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  // Auth check
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;

  // Fetch payment via DAL (includes auth + relations).
  // Re-throw framework signals so unauthorized()/forbidden()/notFound()
  // emitted from inside the DAL get the right HTTP status (the
  // previous version coerced *every* exception — including a real
  // DB outage — into a 401, hiding outages from operators and
  // misreporting forbidden as unauthorized).
  let payment;
  try {
    payment = await getPaymentWithDetails(paymentId);
  } catch (err) {
    if (isFrameworkSignal(err)) throw err;
    logger.error(
      { err, paymentId, route: 'invoices/[paymentId]' },
      'getPaymentWithDetails failed'
    );
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: 'Invoice only available for completed payments' },
      { status: 400 }
    );
  }

  // Build invoice data
  const customerName = payment.customer
    ? `${payment.customer.firstName} ${payment.customer.lastName}`
    : 'Unknown Customer';
  const customerEmail = payment.customer?.email ?? undefined;
  const sessionDescription =
    payment.tattooSession?.designDescription ?? 'Tattoo Session';
  const invoiceNumber = `INV-${paymentId.slice(0, 8).toUpperCase()}`;

  // Fetch invoice terms from settings. Falling back to a hardcoded
  // default on a real DB error is intentional (terms aren't critical
  // for invoice generation); but framework signals must still propagate
  // so a deeper unauthorized()/forbidden() doesn't get masked.
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

  const invoiceHtml = renderInvoiceHtml({
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

  // Health check: 5-second timeout pre-ping
  try {
    const healthCheck = await fetch(STIRLING_PDF_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    if (!healthCheck.ok && healthCheck.status !== 405) {
      // 405 is acceptable (HEAD not allowed but service is up)
      return NextResponse.json(
        { error: 'Invoice generation service is temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invoice generation service is temporarily unavailable. Please try again in a few minutes.' },
      { status: 503 }
    );
  }

  // Convert HTML to PDF via Stirling PDF
  try {
    const formData = new FormData();
    formData.append(
      'fileInput',
      new Blob([invoiceHtml], { type: 'text/html' }),
      'invoice.html'
    );
    formData.append('zoom', '1');

    const pdfResponse = await fetch(STIRLING_PDF_URL, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'Invoice generation temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const pdfBlob = await pdfResponse.blob();

    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${paymentId.slice(0, 8)}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invoice generation temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }
}
