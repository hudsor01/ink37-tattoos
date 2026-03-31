import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getSessions } from '@/lib/dal/sessions';
<<<<<<< HEAD
import { logger } from '@/lib/logger';
||||||| fdedb97
=======
import { createLogger } from '@/lib/logger';

const log = createLogger('api:admin-sessions');
>>>>>>> worktree-agent-a2c56885

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
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch (err) {
<<<<<<< HEAD
    logger.error({ err }, 'GET /api/admin/sessions failed');
||||||| fdedb97
    console.error('[API] GET /api/admin/sessions failed:', err);
=======
    log.error({ err }, 'GET /api/admin/sessions failed');
>>>>>>> worktree-agent-a2c56885
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
