import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('better-auth.session_token');

  // Protected routes: require session
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Auth pages: redirect authenticated users
  if (pathname === '/login' || pathname === '/register') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*', '/login', '/register'],
};
