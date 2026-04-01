import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Liveness probe — returns 200 if the process is running.
 * Use for K8s livenessProbe or uptime monitors.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
