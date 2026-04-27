import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';


/**
 * Detailed database health check — reports connectivity, query latency,
 * and server version. Use for monitoring dashboards and alerting.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    // Measure query latency
    const start = performance.now();
    const result = await db.execute(sql`SELECT version() AS version`);
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;

    const version =
      result.rows?.[0] && typeof result.rows[0] === 'object' && 'version' in result.rows[0]
        ? String(result.rows[0].version)
        : 'unknown';

    return NextResponse.json(
      {
        status: 'ok' as const,
        timestamp,
        database: {
          connected: true,
          latencyMs,
          version,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      {
        status: 'error' as const,
        timestamp,
        database: {
          connected: false,
          error: message,
        },
      },
      { status: 503, headers }
    );
  }
}
