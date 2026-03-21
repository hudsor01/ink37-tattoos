import { NextResponse } from 'next/server';
import { getMediaItems } from '@/lib/dal/media';

export async function GET() {
  try {
    const media = await getMediaItems();
    return NextResponse.json(media);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
