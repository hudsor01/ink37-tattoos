import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

interface RateLimiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

// ---------------------------------------------------------------------------
// In-memory fallback for development (same API surface)
// ---------------------------------------------------------------------------

class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; reset: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now >= entry.reset) {
      const reset = now + this.windowMs;
      this.store.set(identifier, { count: 1, reset });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: entry.reset,
      };
    }

    entry.count++;
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      reset: entry.reset,
    };
  }
}

// ---------------------------------------------------------------------------
// Window duration string to milliseconds (for in-memory fallback)
// ---------------------------------------------------------------------------

function windowToMs(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 60_000; // default 1 minute
  const [, num, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return Number(num) * (multipliers[unit] ?? 60_000);
}

// ---------------------------------------------------------------------------
// Factory: create Upstash-backed or in-memory rate limiter
// ---------------------------------------------------------------------------

function createLimiter(
  requests: number,
  window: string,
  prefix: string
): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(
        requests,
        window as Parameters<typeof Ratelimit.slidingWindow>[1]
      ),
      prefix,
      ephemeralCache: new Map(),
    });
  }

  // Development fallback -- not suitable for production
  // Note: warning logged once at module init; no import of logger here to avoid
  // circular/server-only constraints in this shared module.

  return new InMemoryRateLimiter(requests, windowToMs(window));
}

// ---------------------------------------------------------------------------
// Per-route rate limiters
// ---------------------------------------------------------------------------

export const rateLimiters = {
  /** Contact form: 5 requests per minute */
  contact: createLimiter(5, '1 m', 'rl:contact'),
  /** Store digital download: 20 requests per minute */
  storeDownload: createLimiter(20, '1 m', 'rl:download'),
  /** Portal billing portal session: 10 requests per minute */
  portalBilling: createLimiter(10, '1 m', 'rl:billing'),
  /** Webhooks (Stripe, Cal.com, Resend): 100 requests per minute */
  webhook: createLimiter(100, '1 m', 'rl:webhook'),
  /** Admin data routes (/api/admin/*): 60 requests per minute */
  admin: createLimiter(60, '1 m', 'rl:admin'),
  /** Upload routes (/api/upload/*): 20 requests per minute */
  upload: createLimiter(20, '1 m', 'rl:upload'),
} as const;

// ---------------------------------------------------------------------------
// Lightweight synchronous rate limiter (server actions, middleware)
// ---------------------------------------------------------------------------

// Global in-memory store shared across all rateLimit() calls
const __rateLimitStore = new Map<string, { count: number; reset: number }>();
(globalThis as unknown as { __rateLimitStore: typeof __rateLimitStore }).__rateLimitStore = __rateLimitStore;

/**
 * Synchronous fixed-window rate limiter.
 * Returns true if the request is allowed, false if rate-limited.
 * Used by server actions that need a simple boolean check.
 */
export function rateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = __rateLimitStore.get(identifier);

  if (!entry || now >= entry.reset) {
    __rateLimitStore.set(identifier, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// IP extraction helpers
// ---------------------------------------------------------------------------

/** Extract client IP from Request object (API routes) */
export function getRequestIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

/** Extract client IP from headers() (server actions) */
export function getHeaderIp(hdrs: Headers): string {
  const xff = hdrs.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return hdrs.get('x-real-ip') ?? '127.0.0.1';
}

// ---------------------------------------------------------------------------
// 429 response helper
// ---------------------------------------------------------------------------

/** Create a 429 Too Many Requests response with Retry-After header */
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return Response.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(retryAfter, 1)),
        'X-RateLimit-Reset': String(reset),
      },
    }
  );
}
