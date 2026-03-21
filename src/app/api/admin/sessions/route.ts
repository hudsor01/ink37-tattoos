import { NextResponse } from 'next/server';
import { getSessions } from '@/lib/dal/sessions';

export async function GET() {
  try {
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
