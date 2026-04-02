import crypto from 'node:crypto';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Constants (shared with notifications-cleanup route for lock acquire/release)
// ---------------------------------------------------------------------------

export const LOCK_KEY = 'lock:notification-cleanup';
export const LOCK_TTL_SECONDS = 300; // 5 minutes max lock time (prevent stale locks)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CronAuthResult =
  | { valid: true }
  | { valid: false; error: string; status: number };

// ---------------------------------------------------------------------------
// Timing-safe bearer token verification
// ---------------------------------------------------------------------------

/**
 * Constant-time string comparison using HMAC to normalize lengths.
 * Prevents timing attacks where string === leaks match position.
 *
 * Why HMAC: crypto.timingSafeEqual throws RangeError if buffers differ in
 * length. Since the attacker controls the Authorization header length, raw
 * Buffer comparison would leak length information. HMAC produces fixed 32-byte
 * digests regardless of input length.
 */
function timingSafeCompare(a: string, b: string): boolean {
  const key = crypto.randomBytes(32);
  const hmacA = crypto.createHmac('sha256', key).update(a).digest();
  const hmacB = crypto.createHmac('sha256', key).update(b).digest();
  return crypto.timingSafeEqual(hmacA, hmacB);
}

/**
 * Verify that the incoming request has a valid Bearer token matching CRON_SECRET.
 *
 * Shared across all cron route handlers (notifications-cleanup, balance-due,
 * no-show-followup). Uses HMAC-then-timingSafeEqual to prevent timing attacks.
 *
 * @param request - The incoming HTTP request
 * @returns CronAuthResult indicating whether auth passed or failed with error details
 */
export function verifyCronAuth(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { valid: false, error: 'CRON_SECRET not configured', status: 500 };
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  if (!timingSafeCompare(authHeader, expected)) {
    return { valid: false, error: 'Unauthorized', status: 401 };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Shared Redis client (lazy singleton)
// ---------------------------------------------------------------------------

/**
 * Module-level cached Redis instance. `undefined` means not yet initialized,
 * `null` means initialization was attempted but env vars are missing.
 */
let _redis: Redis | null | undefined;

/**
 * Returns a shared Redis client singleton. On first call, reads
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from process.env.
 * If either is missing, caches and returns null. Subsequent calls return
 * the cached instance without creating new Redis connections.
 */
export function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    _redis = null;
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}
