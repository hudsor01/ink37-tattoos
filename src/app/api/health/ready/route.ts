import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Readiness probe — returns 200 only when the database is reachable.
 * Use for K8s readinessProbe to prevent traffic before dependencies are ready.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      { status: 'ok' as const, timestamp },
      { status: 200, headers }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      { status: 'error' as const, timestamp, error: message },
      { status: 503, headers }
    );
  }
}
