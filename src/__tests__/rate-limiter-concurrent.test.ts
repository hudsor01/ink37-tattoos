import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit } from '@/lib/security/rate-limiter';

// Access the global store directly for test isolation
const getStore = () =>
  (globalThis as unknown as { __rateLimitStore: Map<string, unknown> })
    .__rateLimitStore;

describe('Rate Limiter Concurrent Load Tests', () => {
  beforeEach(() => {
    getStore().clear();
    vi.restoreAllMocks();
  });

  describe('Concurrent Burst Tests', () => {
    it('allows exactly the limit number of concurrent requests and rejects the rest', () => {
      const limit = 5;
      const totalRequests = 20;
      const uniqueIp = `burst-ip-${Date.now()}-${Math.random()}`;

      // Fire all requests "simultaneously" (synchronous, but simulates concurrent burst)
      const results = Array.from({ length: totalRequests }, () =>
        rateLimit(uniqueIp, limit, 60000)
      );

      const allowed = results.filter(Boolean).length;
      const blocked = results.filter((r) => !r).length;

      expect(allowed).toBe(limit);
      expect(blocked).toBe(totalRequests - limit);
    });

    it('enforces limit under Promise.all concurrent load', async () => {
      const limit = 3;
      const totalRequests = 10;
      const uniqueIp = `promise-all-ip-${Date.now()}-${Math.random()}`;

      // Use Promise.all to simulate concurrent requests
      const results = await Promise.all(
        Array.from({ length: totalRequests }, () =>
          Promise.resolve(rateLimit(uniqueIp, limit, 60000))
        )
      );

      const allowed = results.filter(Boolean).length;
      const blocked = results.filter((r) => !r).length;

      expect(allowed).toBe(limit);
      expect(blocked).toBe(totalRequests - limit);
    });

    it('handles high concurrency (100 requests, limit 10)', () => {
      const limit = 10;
      const totalRequests = 100;
      const uniqueIp = `high-concurrency-${Date.now()}-${Math.random()}`;

      const results = Array.from({ length: totalRequests }, () =>
        rateLimit(uniqueIp, limit, 60000)
      );

      const allowed = results.filter(Boolean).length;
      expect(allowed).toBe(limit);
      expect(results.filter((r) => !r).length).toBe(totalRequests - limit);
    });
  });

  describe('Independent IP Limits Under Concurrent Load', () => {
    it('tracks multiple IPs independently during concurrent burst', () => {
      const limit = 3;
      const ipCount = 5;
      const requestsPerIp = 10;

      const ipAddresses = Array.from({ length: ipCount }, (_, i) =>
        `independent-ip-${i}-${Date.now()}-${Math.random()}`
      );

      // Fire requests in interleaved order (ip1, ip2, ip3, ip1, ip2, ip3, ...)
      const results: { ip: string; allowed: boolean }[] = [];
      for (let req = 0; req < requestsPerIp; req++) {
        for (const ip of ipAddresses) {
          results.push({
            ip,
            allowed: rateLimit(ip, limit, 60000),
          });
        }
      }

      // Each IP should have exactly `limit` allowed requests
      for (const ip of ipAddresses) {
        const ipResults = results.filter((r) => r.ip === ip);
        const ipAllowed = ipResults.filter((r) => r.allowed).length;
        expect(ipAllowed).toBe(limit);
      }
    });

    it('concurrent Promise.all with different IPs maintains independence', async () => {
      const limit = 5;
      const ips = ['ip-alpha', 'ip-beta', 'ip-gamma'].map(
        (name) => `${name}-${Date.now()}-${Math.random()}`
      );

      // Fire mixed requests via Promise.all
      const requests = ips.flatMap((ip) =>
        Array.from({ length: limit + 5 }, () => ({
          ip,
          promise: Promise.resolve(rateLimit(ip, limit, 60000)),
        }))
      );

      const results = await Promise.all(
        requests.map(async (r) => ({
          ip: r.ip,
          allowed: await r.promise,
        }))
      );

      for (const ip of ips) {
        const ipAllowed = results.filter((r) => r.ip === ip && r.allowed).length;
        expect(ipAllowed).toBe(limit);
      }
    });
  });

  describe('Window Reset Under Load', () => {
    it('resets rate limit after window expires and allows new burst', () => {
      const limit = 3;
      const windowMs = 1000;
      const uniqueIp = `reset-ip-${Date.now()}-${Math.random()}`;

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Exhaust the limit
      const firstBurst = Array.from({ length: limit + 2 }, () =>
        rateLimit(uniqueIp, limit, windowMs)
      );
      expect(firstBurst.filter(Boolean).length).toBe(limit);
      expect(firstBurst.filter((r) => !r).length).toBe(2);

      // Advance time past the window
      vi.spyOn(Date, 'now').mockReturnValue(now + windowMs + 1);

      // Second burst should be allowed again
      const secondBurst = Array.from({ length: limit + 2 }, () =>
        rateLimit(uniqueIp, limit, windowMs)
      );
      expect(secondBurst.filter(Boolean).length).toBe(limit);
      expect(secondBurst.filter((r) => !r).length).toBe(2);

      vi.restoreAllMocks();
    });

    it('does not reset before window expires', () => {
      const limit = 2;
      const windowMs = 5000;
      const uniqueIp = `no-reset-ip-${Date.now()}-${Math.random()}`;

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Exhaust the limit
      rateLimit(uniqueIp, limit, windowMs);
      rateLimit(uniqueIp, limit, windowMs);
      expect(rateLimit(uniqueIp, limit, windowMs)).toBe(false);

      // Advance time but not past the window
      vi.spyOn(Date, 'now').mockReturnValue(now + windowMs - 1);
      expect(rateLimit(uniqueIp, limit, windowMs)).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe('Simulated Rate Limiter Variants', () => {
    it('contact form rate limiter: 5 requests per 60s window', () => {
      const limit = 5;
      const windowMs = 60_000;
      const ip = `contact-${Date.now()}-${Math.random()}`;

      const results = Array.from({ length: 8 }, () =>
        rateLimit(ip, limit, windowMs)
      );

      expect(results.filter(Boolean).length).toBe(5);
      expect(results.filter((r) => !r).length).toBe(3);
    });

    it('store download rate limiter: 10 requests per 60s window', () => {
      const limit = 10;
      const windowMs = 60_000;
      const ip = `store-download-${Date.now()}-${Math.random()}`;

      const results = Array.from({ length: 15 }, () =>
        rateLimit(ip, limit, windowMs)
      );

      expect(results.filter(Boolean).length).toBe(10);
      expect(results.filter((r) => !r).length).toBe(5);
    });

    it('portal billing rate limiter: 3 requests per 60s window', () => {
      const limit = 3;
      const windowMs = 60_000;
      const ip = `portal-billing-${Date.now()}-${Math.random()}`;

      const results = Array.from({ length: 6 }, () =>
        rateLimit(ip, limit, windowMs)
      );

      expect(results.filter(Boolean).length).toBe(3);
      expect(results.filter((r) => !r).length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('limit of 1 only allows a single request', () => {
      const ip = `single-${Date.now()}-${Math.random()}`;
      expect(rateLimit(ip, 1, 60000)).toBe(true);
      expect(rateLimit(ip, 1, 60000)).toBe(false);
      expect(rateLimit(ip, 1, 60000)).toBe(false);
    });

    it('new identifier always gets first request allowed', () => {
      const results = Array.from({ length: 50 }, (_, i) =>
        rateLimit(`unique-${i}-${Date.now()}-${Math.random()}`, 1, 60000)
      );
      // Every unique IP should be allowed (first request)
      expect(results.every(Boolean)).toBe(true);
    });

    it('concurrent requests across many unique IPs all succeed on first try', async () => {
      const ips = Array.from({ length: 100 }, (_, i) =>
        `mass-ip-${i}-${Date.now()}-${Math.random()}`
      );

      const results = await Promise.all(
        ips.map((ip) => Promise.resolve(rateLimit(ip, 5, 60000)))
      );

      // All first requests should succeed
      expect(results.every(Boolean)).toBe(true);
    });
  });
});
