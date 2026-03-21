import { NextResponse } from 'next/server';
import { getAppointments } from '@/lib/dal/appointments';

export async function GET() {
  try {
    const appointments = await getAppointments();
    return NextResponse.json(appointments);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
