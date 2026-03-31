import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthResponse {
  status: 'ok' | 'error';
  db: 'connected' | 'disconnected';
  timestamp: string;
  uptime: number;
  error?: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  try {
    // Verify DB connectivity with a simple query
    await db.execute(sql`SELECT 1`);

    const response: HealthResponse = {
      status: 'ok',
      db: 'connected',
      timestamp,
      uptime: process.uptime(),
    };

    return NextResponse.json(response, { status: 200, headers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown database error';

    logger.error({ err: error }, 'Health check failed: database unreachable');

    const response: HealthResponse = {
      status: 'error',
      db: 'disconnected',
      timestamp,
      uptime: process.uptime(),
      error: message,
    };

    return NextResponse.json(response, { status: 503, headers });
  }
}
