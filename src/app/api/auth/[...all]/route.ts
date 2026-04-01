import { toNextJsHandler } from 'better-auth/next-js';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

let _handler: ReturnType<typeof toNextJsHandler>;
function handler() {
  if (!_handler) {
    // Lazy init: avoid triggering env() parsing during build-time page data collection
    const { getAuthInstance } = require('@/lib/auth') as typeof import('@/lib/auth');
    _handler = toNextJsHandler(getAuthInstance());
  }
  return _handler;
}

export function GET(request: NextRequest) {
  return handler().GET(request);
}

export function POST(request: NextRequest) {
  return handler().POST(request);
}
