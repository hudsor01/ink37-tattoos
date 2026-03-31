import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getAppointments } from '@/lib/dal/appointments';
<<<<<<< HEAD
import { logger } from '@/lib/logger';
||||||| fdedb97
=======
import { createLogger } from '@/lib/logger';

const log = createLogger('api:admin-appointments');
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
    const appointments = await getAppointments();
    return NextResponse.json(appointments);
  } catch (err) {
<<<<<<< HEAD
    logger.error({ err }, 'GET /api/admin/appointments failed');
||||||| fdedb97
    console.error('[API] GET /api/admin/appointments failed:', err);
=======
    log.error({ err }, 'GET /api/admin/appointments failed');
>>>>>>> worktree-agent-a2c56885
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
