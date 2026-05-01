import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

const ADMIN_ROLES = ['admin', 'super_admin'];

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const { success, reset } = await rateLimiters.upload.limit(ip);
  if (!success) return rateLimitResponse(reset);

  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Auth already verified above -- just return token config
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        logger.info({ blobUrl: blob.url }, 'Client upload completed');
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    if (isFrameworkSignal(err)) throw err;
    logger.error({ err }, 'POST /api/upload/token failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
