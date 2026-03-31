import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getMediaItems, type MediaApprovalStatus } from '@/lib/dal/media';
import { logger } from '@/lib/logger';
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

const ADMIN_ROLES = ['admin', 'super_admin'];

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;
    const tag = searchParams.get('tag') || undefined;
    const approvalStatusParam = searchParams.get('approvalStatus') as MediaApprovalStatus | null;
    const approvalStatus = approvalStatusParam && ['approved', 'pending', 'all'].includes(approvalStatusParam)
      ? approvalStatusParam
      : undefined;
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 20;

    const media = await getMediaItems({ page, pageSize, search, tag, approvalStatus });
    return NextResponse.json(media);
  } catch (err) {
    logger.error({ err }, 'GET /api/admin/media failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
