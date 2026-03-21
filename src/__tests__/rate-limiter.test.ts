import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('rateLimit', () => {
  // We need to reimport for each test to get fresh module state
  let rateLimit: (identifier: string, maxRequests: number, windowMs: number) => boolean;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/lib/security/rate-limiter');
    rateLimit = mod.rateLimit;
  });

  it('allows requests within the limit', () => {
    expect(rateLimit('test-ip', 3, 60000)).toBe(true);
    expect(rateLimit('test-ip', 3, 60000)).toBe(true);
    expect(rateLimit('test-ip', 3, 60000)).toBe(true);
  });

  it('blocks requests exceeding the limit', () => {
    expect(rateLimit('block-ip', 3, 60000)).toBe(true);
    expect(rateLimit('block-ip', 3, 60000)).toBe(true);
    expect(rateLimit('block-ip', 3, 60000)).toBe(true);
    expect(rateLimit('block-ip', 3, 60000)).toBe(false);
    expect(rateLimit('block-ip', 3, 60000)).toBe(false);
  });

  it('tracks different identifiers independently', () => {
    expect(rateLimit('ip-a', 1, 60000)).toBe(true);
    expect(rateLimit('ip-a', 1, 60000)).toBe(false);
    expect(rateLimit('ip-b', 1, 60000)).toBe(true);
  });

  it('resets after window expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    expect(rateLimit('expire-ip', 2, 1000)).toBe(true);
    expect(rateLimit('expire-ip', 2, 1000)).toBe(true);
    expect(rateLimit('expire-ip', 2, 1000)).toBe(false);

    // Advance time past the window
    vi.spyOn(Date, 'now').mockReturnValue(now + 1001);

    expect(rateLimit('expire-ip', 2, 1000)).toBe(true);

    vi.restoreAllMocks();
  });
});
