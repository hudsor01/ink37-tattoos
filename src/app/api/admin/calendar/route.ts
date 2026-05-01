import { NextRequest, NextResponse } from 'next/server';
import { getAppointmentsByDateRange } from '@/lib/dal/appointments';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';
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
    // Re-throw all Next.js framework signals so the framework can map
    // them to the right HTTP semantics: NEXT_HTTP_ERROR_FALLBACK from
    // unauthorized()/forbidden() (401/403), NEXT_REDIRECT from
    // redirect() (307), NEXT_NOT_FOUND from notFound() (404), and
    // HANGING_PROMISE_REJECTION from any prerender abort. The previous
    // version of this catch only re-threw NEXT_HTTP_ERROR_FALLBACK and
    // would silently 500 on a redirect() or notFound() emitted from
    // deeper in the DAL chain. The message-prefix branch was a
    // workaround for test contexts that throw a bare Error; with
    // isFrameworkSignal's structural check (digest property + string
    // type) we no longer need it -- tests that want to simulate a
    // signal can attach the digest directly.
    if (isFrameworkSignal(error)) throw error;
    logger.error({ err: error }, 'GET /api/admin/calendar failed');
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
