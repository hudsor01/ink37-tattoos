import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getPaymentWithDetails } from '@/lib/dal/payments';
import { renderReceiptHtml } from '@/lib/receipt-template';

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

  // Fetch payment via DAL (includes auth + relations)
  let payment;
  try {
    payment = await getPaymentWithDetails(paymentId);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: 'Receipt only available for completed payments' },
      { status: 400 }
    );
  }

  // Build receipt data
  const customerName = payment.customer
    ? `${payment.customer.firstName} ${payment.customer.lastName}`
    : 'Unknown Customer';
  const customerEmail = payment.customer?.email ?? undefined;
  const sessionDescription = payment.tattooSession?.designDescription ?? 'Tattoo Session';

  const receiptHtml = renderReceiptHtml({
    studioName: 'Ink37 Tattoos',
    customerName,
    customerEmail,
    sessionDescription,
    sessionDate: payment.tattooSession?.appointmentDate ?? undefined,
    amount: payment.amount,
    paymentMethod: payment.type.replace(/_/g, ' '),
    paymentDate: payment.completedAt ?? payment.createdAt,
    receiptNumber: `REC-${paymentId.slice(0, 8).toUpperCase()}`,
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
        { error: 'Receipt generation service is temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Receipt generation service is temporarily unavailable. Please try again in a few minutes.' },
      { status: 503 }
    );
  }

  // Convert HTML to PDF via Stirling PDF
  try {
    const formData = new FormData();
    formData.append(
      'fileInput',
      new Blob([receiptHtml], { type: 'text/html' }),
      'receipt.html'
    );
    formData.append('zoom', '1');

    const pdfResponse = await fetch(STIRLING_PDF_URL, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'Receipt generation temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const pdfBlob = await pdfResponse.blob();

    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${paymentId.slice(0, 8)}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Receipt generation temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }
}
