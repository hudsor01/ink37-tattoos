import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression guard for INK37-TATTOOS-3, "Connection terminated unexpectedly".
 *
 * A pg-style Pool is an EventEmitter, and Node escalates an unhandled 'error'
 * event into an uncaught exception -- which in a serverless function takes the
 * instance down. The neon-serverless driver reaches Postgres over a WebSocket,
 * so idle-connection drops (Neon scale-to-zero, cold start, network blip) are
 * routine, not exceptional.
 *
 * Production saw this twice within a day of error reporting going live:
 *
 *   level: fatal   handled: no   mechanism: auto.node.onuncaughtexception
 *
 * Asserted behaviorally -- that a listener is actually registered on the pool
 * -- rather than by grepping the source for `pool.on`. A source scan would
 * pass on the string appearing in a comment, which is the exact false-positive
 * class that let an earlier bug hide in this repo.
 */

const poolInstances: Array<{ on: ReturnType<typeof vi.fn> }> = [];

vi.mock('server-only', () => ({}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    on = vi.fn();
    constructor() {
      poolInstances.push(this as unknown as { on: ReturnType<typeof vi.fn> });
    }
  },
  neonConfig: {},
}));

vi.mock('drizzle-orm/neon-serverless', () => ({
  drizzle: vi.fn(() => ({ __mockDb: true })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('Neon pool error handling', () => {
  beforeEach(() => {
    poolInstances.length = 0;
    vi.resetModules();
  });

  it('registers an error listener on the Drizzle pool', async () => {
    const { getDb } = await import('@/lib/db');
    getDb();

    expect(poolInstances.length).toBeGreaterThan(0);
    const pool = poolInstances.at(-1)!;
    const events = pool.on.mock.calls.map((c) => c[0]);
    expect(events).toContain('error');
  });

  it('the registered handler swallows the error instead of rethrowing', async () => {
    const { getDb } = await import('@/lib/db');
    getDb();

    const pool = poolInstances.at(-1)!;
    const handler = pool.on.mock.calls.find((c) => c[0] === 'error')?.[1] as
      | ((e: Error) => void)
      | undefined;
    expect(handler).toBeTypeOf('function');

    // The whole point is that a dropped connection must not propagate: the
    // pool discards the dead client and the next query acquires a fresh one,
    // so there is nothing to recover -- the crash was the only failure.
    expect(() => handler!(new Error('Connection terminated unexpectedly'))).not.toThrow();
  });
});
