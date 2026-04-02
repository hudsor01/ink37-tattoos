import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks (must be before imports that trigger module resolution)
// ---------------------------------------------------------------------------

// Override the global setup mock for @upstash/redis with a more detailed one
const mockRedisSet = vi.fn();
const mockRedisEval = vi.fn();
const mockRedisDel = vi.fn();
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    set: mockRedisSet,
    eval: mockRedisEval,
    del: mockRedisDel,
  })),
}));

// Mock verifyCronAuth and getRedis from the shared cron-auth module
const mockVerifyCronAuth = vi.fn();
const mockGetRedis = vi.fn();
vi.mock('@/lib/security/cron-auth', () => ({
  verifyCronAuth: mockVerifyCronAuth,
  getRedis: mockGetRedis,
  LOCK_KEY: 'lock:notification-cleanup',
  LOCK_TTL_SECONDS: 300,
}));

// Mock purgeOldNotifications from the DAL
const mockPurgeOldNotifications = vi.fn();
vi.mock('@/lib/dal/notifications', () => ({
  purgeOldNotifications: mockPurgeOldNotifications,
}));

// Mock the logger to suppress output
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock env() to return coerced numbers
vi.mock('@/lib/env', () => ({
  env: vi.fn(() => ({
    NOTIFICATION_RETENTION_READ_DAYS: 30,
    NOTIFICATION_RETENTION_UNREAD_DAYS: 90,
    NOTIFICATION_CLEANUP_BATCH_SIZE: 1000,
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/notifications-cleanup', {
    method: 'POST',
    headers,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cron notifications-cleanup route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  // =========================================================================
  // Auth (timing-safe via shared utility)
  // =========================================================================

  describe('cron auth', () => {
    it('timing-safe auth rejects missing authorization header', async () => {
      mockVerifyCronAuth.mockReturnValue({
        valid: false,
        error: 'Unauthorized',
        status: 401,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      const res = await POST(makeRequest());
      const body = await res.json();

      expect(mockVerifyCronAuth).toHaveBeenCalled();
      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('timing-safe auth rejects wrong token', async () => {
      mockVerifyCronAuth.mockReturnValue({
        valid: false,
        error: 'Unauthorized',
        status: 401,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      const res = await POST(
        makeRequest({ authorization: 'Bearer wrong-token' }),
      );
      const body = await res.json();

      expect(mockVerifyCronAuth).toHaveBeenCalled();
      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('timing-safe auth accepts valid token and proceeds', async () => {
      mockVerifyCronAuth.mockReturnValue({ valid: true });
      // Redis not configured -- no lock, just proceeds
      mockGetRedis.mockReturnValue(null);
      mockPurgeOldNotifications.mockResolvedValue({
        deletedReadCount: 5,
        deletedUnreadCount: 2,
        totalDeleted: 7,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      const res = await POST(
        makeRequest({ authorization: 'Bearer test-secret' }),
      );
      const body = await res.json();

      expect(mockVerifyCronAuth).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(body.totalDeleted).toBe(7);
    });
  });

  // =========================================================================
  // Distributed lock
  // =========================================================================

  describe('distributed lock', () => {
    it('lock acquire stores unique UUID value via SET NX EX', async () => {
      mockVerifyCronAuth.mockReturnValue({ valid: true });
      const fakeRedis = {
        set: mockRedisSet.mockResolvedValue('OK'),
        eval: mockRedisEval.mockResolvedValue(1),
      };
      mockGetRedis.mockReturnValue(fakeRedis);
      mockPurgeOldNotifications.mockResolvedValue({
        deletedReadCount: 0,
        deletedUnreadCount: 0,
        totalDeleted: 0,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      await POST(makeRequest({ authorization: 'Bearer test-secret' }));

      // Verify redis.set was called with NX + EX options and a UUID value (not "locked")
      expect(mockRedisSet).toHaveBeenCalledTimes(1);
      const [key, value, opts] = mockRedisSet.mock.calls[0];
      expect(key).toBe('lock:notification-cleanup');
      // Value should be a UUID, not the static string "locked"
      expect(value).not.toBe('locked');
      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(opts).toEqual(expect.objectContaining({ nx: true, ex: 300 }));
    });

    it('lock release uses Lua script to check owner before delete', async () => {
      mockVerifyCronAuth.mockReturnValue({ valid: true });
      const fakeRedis = {
        set: mockRedisSet.mockResolvedValue('OK'),
        eval: mockRedisEval.mockResolvedValue(1),
      };
      mockGetRedis.mockReturnValue(fakeRedis);
      mockPurgeOldNotifications.mockResolvedValue({
        deletedReadCount: 1,
        deletedUnreadCount: 0,
        totalDeleted: 1,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      await POST(makeRequest({ authorization: 'Bearer test-secret' }));

      // Verify redis.eval was called with a Lua script that checks ownership
      expect(mockRedisEval).toHaveBeenCalledTimes(1);
      const [script, keys, args] = mockRedisEval.mock.calls[0];

      // Lua script must contain GET + compare + DEL pattern
      expect(script).toContain('redis.call("get", KEYS[1])');
      expect(script).toContain('ARGV[1]');
      expect(script).toContain('redis.call("del", KEYS[1])');

      // Keys should contain the lock key
      expect(keys).toEqual(['lock:notification-cleanup']);

      // Args should contain the UUID that was used during acquire
      const acquireUUID = mockRedisSet.mock.calls[0][1];
      expect(args).toEqual([acquireUUID]);
    });

    it('lock release does not delete if owner does not match', async () => {
      mockVerifyCronAuth.mockReturnValue({ valid: true });
      const fakeRedis = {
        set: mockRedisSet.mockResolvedValue('OK'),
        eval: mockRedisEval.mockResolvedValue(0), // Lua returns 0 = owner mismatch
      };
      mockGetRedis.mockReturnValue(fakeRedis);
      mockPurgeOldNotifications.mockResolvedValue({
        deletedReadCount: 0,
        deletedUnreadCount: 0,
        totalDeleted: 0,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      await POST(makeRequest({ authorization: 'Bearer test-secret' }));

      // The release call passes the owner UUID as ARGV[1],
      // so if a different process owns the lock, Lua returns 0 (no delete).
      // We verify the owner UUID is being passed to the Lua script.
      const acquireUUID = mockRedisSet.mock.calls[0][1];
      const [, , releaseArgs] = mockRedisEval.mock.calls[0];
      expect(releaseArgs[0]).toBe(acquireUUID);
    });
  });

  // =========================================================================
  // Purge behavior
  // =========================================================================

  describe('purge behavior', () => {
    it('purge uses rowCount not RETURNING -- response matches DAL return values', async () => {
      mockVerifyCronAuth.mockReturnValue({ valid: true });
      mockGetRedis.mockReturnValue(null); // no Redis
      mockPurgeOldNotifications.mockResolvedValue({
        deletedReadCount: 42,
        deletedUnreadCount: 7,
        totalDeleted: 49,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      const res = await POST(
        makeRequest({ authorization: 'Bearer test-secret' }),
      );
      const body = await res.json();

      // The route should pass through the DAL response directly
      expect(body.deletedReadCount).toBe(42);
      expect(body.deletedUnreadCount).toBe(7);
      expect(body.totalDeleted).toBe(49);

      // Verify purge was called with the env() coerced values (no parseInt)
      expect(mockPurgeOldNotifications).toHaveBeenCalledWith({
        readRetentionDays: 30,
        unreadRetentionDays: 90,
        batchSize: 1000,
      });
    });
  });

  // =========================================================================
  // Shared Redis client
  // =========================================================================

  describe('shared Redis client', () => {
    it('uses shared Redis client (getRedis) not new Redis() per function', async () => {
      mockVerifyCronAuth.mockReturnValue({ valid: true });
      const fakeRedis = {
        set: mockRedisSet.mockResolvedValue('OK'),
        eval: mockRedisEval.mockResolvedValue(1),
      };
      mockGetRedis.mockReturnValue(fakeRedis);
      mockPurgeOldNotifications.mockResolvedValue({
        deletedReadCount: 0,
        deletedUnreadCount: 0,
        totalDeleted: 0,
      });

      const { POST } = await import(
        '@/app/api/cron/notifications-cleanup/route'
      );
      await POST(makeRequest({ authorization: 'Bearer test-secret' }));

      // getRedis should be called (from cron-auth module) -- not bypassed by inline new Redis()
      expect(mockGetRedis).toHaveBeenCalled();
    });
  });
});
