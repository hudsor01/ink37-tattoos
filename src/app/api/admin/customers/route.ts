import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getCustomers } from '@/lib/dal/customers';

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
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch (err) {
    console.error('[API] GET /api/admin/customers failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
