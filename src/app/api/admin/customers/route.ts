import { NextResponse } from 'next/server';
import { getCustomers } from '@/lib/dal/customers';

export async function GET() {
  try {
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
