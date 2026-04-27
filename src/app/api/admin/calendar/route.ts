import { NextRequest, NextResponse } from 'next/server';
import { getAppointmentsByDateRange } from '@/lib/dal/appointments';
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

export async function GET(request: NextRequest) {
  const ip = getRequestIp(request);
  const { success, reset } = await rateLimiters.admin.limit(ip);
  if (!success) return rateLimitResponse(reset);

  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Both "start" and "end" query parameters are required' },
      { status: 400 }
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date format. Use ISO 8601 date strings.' },
      { status: 400 }
    );
  }

  try {
    // getAppointmentsByDateRange calls requireStaffRole() internally
    const appointments = await getAppointmentsByDateRange(startDate, endDate);

    // Serialize dates to ISO strings
    const serialized = appointments.map((apt) => ({
      ...apt,
      scheduledDate: apt.scheduledDate.toISOString(),
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString(),
    }));

    return NextResponse.json({ appointments: serialized });
  } catch (error) {
    // Re-throw forbidden() / unauthorized() so Next maps them to 403 / 401.
    // Match on the public digest shape instead of the internal isHTTPAccessFallbackError helper.
    const digest = (error as { digest?: string } | null)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')) {
      throw error;
    }
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
