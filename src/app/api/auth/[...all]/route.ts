import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

async function handleAuth(request: NextRequest) {
  const { getAuthInstance } = await import('@/lib/auth');
  const authInstance = getAuthInstance();
  const response = await authInstance.handler(request);

  // Debug: log Set-Cookie presence on sign-in
  const url = new URL(request.url);
  if (url.pathname.includes('sign-in')) {
    const cookies = response.headers.getSetCookie?.() ?? [];
    console.log(`[auth-debug] ${request.method} ${url.pathname} status=${response.status} set-cookie-count=${cookies.length} cookies=${cookies.map(c => c.split('=')[0]).join(',')}`);
  }

  return response;
}

export async function POST(request: NextRequest) {
  return handleAuth(request);
}

export async function GET(request: NextRequest) {
  return handleAuth(request);
}
