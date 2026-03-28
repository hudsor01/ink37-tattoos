import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getMediaItems } from '@/lib/dal/media';

const ADMIN_ROLES = ['admin', 'super_admin'];

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const media = await getMediaItems();
    return NextResponse.json(media);
  } catch (err) {
    console.error('[API] GET /api/admin/media failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
