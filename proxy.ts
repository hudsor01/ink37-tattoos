import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/portal'];
const authPages = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('better-auth.session_token');

  // Protected routes: redirect to login if no session cookie
  if (protectedPrefixes.some(prefix => pathname.startsWith(prefix))) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Auth pages: redirect to dashboard if already logged in
  if (authPages.some(page => pathname.startsWith(page))) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
