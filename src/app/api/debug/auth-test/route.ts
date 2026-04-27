import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';


// GET: check if session cookie exists in the request
export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('better-auth.session_token');
  const allCookies = cookieStore.getAll();

  return NextResponse.json({
    hasSession: !!sessionToken,
    sessionTokenPreview: sessionToken?.value?.slice(0, 10) + '...',
    cookieNames: allCookies.map(c => c.name),
    cookieCount: allCookies.length,
    timestamp: new Date().toISOString(),
  });
}

// POST: set a test cookie to verify cookie setting works
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('debug-test', 'works', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60,
  });

  return NextResponse.json({ message: 'Test cookie set', timestamp: new Date().toISOString() });
}
