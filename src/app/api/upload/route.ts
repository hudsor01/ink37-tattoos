import { put } from '@vercel/blob';
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

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Validate file size (10MB max)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  try {
    const blob = await put(`portfolio/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    if (isFrameworkSignal(err)) throw err;
    logger.error({ err }, 'POST /api/upload failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
