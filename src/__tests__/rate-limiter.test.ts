import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rateLimiters,
  getRequestIp,
  getHeaderIp,
  rateLimitResponse,
} from '@/lib/security/rate-limiter';

describe('rateLimiters (in-memory fallback)', () => {
  // In test env, UPSTASH_REDIS_REST_URL is not set, so we get in-memory fallback

  it('allows requests within the contact limit (5/min)', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await rateLimiters.contact.limit(`contact-ok-${Date.now()}-${i}`);
      expect(result.success).toBe(true);
    }
  });

  it('blocks contact requests exceeding 5/min', async () => {
    const ip = `contact-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = await rateLimiters.contact.limit(ip);
      expect(result.success).toBe(true);
    }
    const blocked = await rateLimiters.contact.limit(ip);
    expect(blocked.success).toBe(false);
  });

  it('returns remaining count', async () => {
    const ip = `remaining-${Date.now()}`;
    const first = await rateLimiters.contact.limit(ip);
    expect(first.remaining).toBe(4); // 5 limit, 1 used
    const second = await rateLimiters.contact.limit(ip);
    expect(second.remaining).toBe(3);
  });

  it('returns reset timestamp', async () => {
    const ip = `reset-${Date.now()}`;
    const result = await rateLimiters.contact.limit(ip);
    expect(result.reset).toBeGreaterThan(Date.now() - 1000);
    expect(result.reset).toBeLessThanOrEqual(Date.now() + 61_000);
  });

  it('tracks different identifiers independently', async () => {
    const result1 = await rateLimiters.storeDownload.limit(`ip-a-${Date.now()}`);
    expect(result1.success).toBe(true);
    const result2 = await rateLimiters.storeDownload.limit(`ip-b-${Date.now()}`);
    expect(result2.success).toBe(true);
  });

  it('store download allows up to 20 requests', async () => {
    const ip = `download-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      const result = await rateLimiters.storeDownload.limit(ip);
      expect(result.success).toBe(true);
    }
    const blocked = await rateLimiters.storeDownload.limit(ip);
    expect(blocked.success).toBe(false);
  });

  it('resets after window expires', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const ip = 'expire-test';
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      await rateLimiters.contact.limit(ip);
    }
    const blocked = await rateLimiters.contact.limit(ip);
    expect(blocked.success).toBe(false);

    // Advance time past the window (1 minute)
    vi.spyOn(Date, 'now').mockReturnValue(now + 61_000);

    const reset = await rateLimiters.contact.limit(ip);
    expect(reset.success).toBe(true);

    vi.restoreAllMocks();
  });
});

describe('getRequestIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getRequestIp(request)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getRequestIp(request)).toBe('10.0.0.1');
  });

  it('falls back to 127.0.0.1', () => {
    const request = new Request('https://example.com');
    expect(getRequestIp(request)).toBe('127.0.0.1');
  });
});

describe('getHeaderIp', () => {
  it('extracts IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' });
    expect(getHeaderIp(headers)).toBe('192.168.1.1');
  });

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.2' });
    expect(getHeaderIp(headers)).toBe('10.0.0.2');
  });

  it('falls back to 127.0.0.1', () => {
    const headers = new Headers();
    expect(getHeaderIp(headers)).toBe('127.0.0.1');
  });
});

describe('rateLimitResponse', () => {
  it('creates 429 response with Retry-After header', () => {
    const reset = Date.now() + 30_000;
    const response = rateLimitResponse(reset);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(response.headers.get('X-RateLimit-Reset')).toBe(String(reset));
  });

  it('returns JSON error body', async () => {
    const response = rateLimitResponse(Date.now() + 10_000);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
  });

  it('ensures Retry-After is at least 1', () => {
    const response = rateLimitResponse(Date.now() - 1000);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
  });
});
