// Use globalThis to persist rate limit state across module reloads in dev
// and within the same serverless instance in production
const globalStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, { count: number; resetTime: number }>;
};

if (!globalStore.__rateLimitStore) {
  globalStore.__rateLimitStore = new Map();
}

const store = globalStore.__rateLimitStore;

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// Periodic cleanup to prevent memory leaks
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetTime) store.delete(key);
    }
  }, CLEANUP_INTERVAL).unref?.();
}
