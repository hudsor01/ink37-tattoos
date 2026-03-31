import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getCustomers } from '@/lib/dal/customers';
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
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch (err) {
    logger.error({ err }, 'GET /api/admin/customers failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
