import { NextResponse, type NextRequest } from 'next/server';
import { subMonths } from 'date-fns';
import { getCurrentSession } from '@/lib/auth';
import { getAnalyticsDataByDateRange, getComparisonPeriodData } from '@/lib/dal/analytics';
import { renderAnalyticsReportHtml } from '@/lib/analytics-report-template';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];
const STIRLING_PDF_URL = 'https://pdf.thehudsonfam.com/api/v1/convert/html/pdf';

export async function GET(request: NextRequest) {
  // Auth check
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : subMonths(new Date(), 6);

  // Fetch analytics data
  const [analyticsData, comparisonData] = await Promise.all([
    getAnalyticsDataByDateRange(from, to),
    getComparisonPeriodData(from, to),
  ]);

  // Render HTML
  const reportHtml = renderAnalyticsReportHtml({
    from,
    to,
    kpis: analyticsData.kpis,
    comparison: comparisonData,
    revenueData: analyticsData.revenueData,
    appointmentTypes: analyticsData.appointmentTypes,
  });

  // Health check: 5-second timeout pre-ping
  try {
    const healthCheck = await fetch(STIRLING_PDF_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    if (!healthCheck.ok && healthCheck.status !== 405) {
      return NextResponse.json(
        { error: 'PDF generation service is temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'PDF generation service is temporarily unavailable. Please try again in a few minutes.' },
      { status: 503 }
    );
  }

  // Convert HTML to PDF via Stirling PDF
  try {
    const formData = new FormData();
    formData.append(
      'fileInput',
      new Blob([reportHtml], { type: 'text/html' }),
      'analytics-report.html'
    );
    formData.append('zoom', '1');

    const pdfResponse = await fetch(STIRLING_PDF_URL, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'PDF generation temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const pdfBlob = await pdfResponse.blob();

    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="analytics-report.pdf"',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'PDF generation temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }
}
