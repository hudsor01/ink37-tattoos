import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { getSessions } from '@/lib/dal/sessions';
import { logger } from '@/lib/logger';
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

const ADMIN_ROLES = ['admin', 'super_admin'];

export async function GET(request: Request) {
  const ip = getRequestIp(request);
  const { success, reset } = await rateLimiters.admin.limit(ip);
  if (!success) return rateLimitResponse(reset);

  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch (err) {
    if (isFrameworkSignal(err)) throw err;
    logger.error({ err }, 'GET /api/admin/sessions failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
