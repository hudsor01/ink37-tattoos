import { toNextJsHandler } from 'better-auth/next-js';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { getAuthInstance } = await import('@/lib/auth');
  return toNextJsHandler(getAuthInstance()).POST(request);
}

export async function GET(request: NextRequest) {
  const { getAuthInstance } = await import('@/lib/auth');
  return toNextJsHandler(getAuthInstance()).GET(request);
}
