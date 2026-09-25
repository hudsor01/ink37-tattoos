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

  /**
   * Regression guard for INK37-TATTOOS-5, which arrived AFTER the pool-level
   * handler shipped -- proving that fix was incomplete.
   *
   * pg-pool attaches its own `idleListener` to each client, then REMOVES it on
   * checkout (pg-pool/index.js: `client.removeListener('error', idleListener)`).
   * So for the whole duration of a query the client has no error listener, and
   * a socket death there surfaces as an uncaught exception:
   *
   *   Error: Unhandled error. ()
   *     at Connection.reportStreamError -> client.emit('error')
   *
   * Listening on the pool's 'connect' event covers the client for its entire
   * lifetime. pg-pool removes only its own listener by reference, so this one
   * survives checkout.
   */
  it('registers a connect listener so checked-out clients stay covered', async () => {
    const { getDb } = await import('@/lib/db');
    getDb();

    const pool = poolInstances.at(-1)!;
    const events = pool.on.mock.calls.map((c) => c[0]);
    expect(events).toContain('connect');
  });

  it('attaches an error listener to each client as it connects', async () => {
    const { getDb } = await import('@/lib/db');
    getDb();

    const pool = poolInstances.at(-1)!;
    const onConnect = pool.on.mock.calls.find((c) => c[0] === 'connect')?.[1] as
      | ((c: { on: ReturnType<typeof vi.fn> }) => void)
      | undefined;
    expect(onConnect).toBeTypeOf('function');

    // Simulate the pool handing back a freshly connected client.
    const client = { on: vi.fn() };
    onConnect!(client);

    const clientEvents = client.on.mock.calls.map((c) => c[0]);
    expect(clientEvents).toContain('error');

    // And that handler must swallow rather than rethrow -- rethrowing would
    // reproduce the uncaught exception this exists to prevent.
    const handler = client.on.mock.calls.find((c) => c[0] === 'error')?.[1] as (e: Error) => void;
    expect(() => handler(new Error('Unhandled error. ()'))).not.toThrow();
  });
});
