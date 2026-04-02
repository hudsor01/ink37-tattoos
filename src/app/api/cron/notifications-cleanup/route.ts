import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { purgeOldNotifications } from '@/lib/dal/notifications';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import {
  verifyCronAuth,
  getRedis,
  LOCK_KEY,
  LOCK_TTL_SECONDS,
} from '@/lib/security/cron-auth';

/**
 * Lua script for atomic check-and-delete of a Redis lock.
 * Only deletes the key if the current value matches the owner UUID (ARGV[1]).
 * This prevents Process A from accidentally releasing Process B's lock.
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Try to acquire a distributed lock in Redis.
 * Stores a unique UUID as the lock value for owner-checked release.
 *
 * @returns acquired: whether the lock was obtained; owner: the UUID to pass to releaseLock
 */
async function tryAcquireLock(): Promise<{
  acquired: boolean;
  owner: string | null;
}> {
  const redis = getRedis();

  if (!redis) {
    // No Redis configured - allow execution but log warning
    logger.warn(
      'Upstash Redis not configured - running cleanup without overlap prevention',
    );
    return { acquired: true, owner: null };
  }

  try {
    const owner = crypto.randomUUID();
    // SET NX EX = set if not exists with expiration
    const result = await redis.set(LOCK_KEY, owner, {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });
    if (result === 'OK') {
      return { acquired: true, owner };
    }
    return { acquired: false, owner: null };
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to acquire Redis lock - allowing cleanup to proceed',
    );
    return { acquired: true, owner: null }; // Fail open
  }
}

/**
 * Release the distributed lock using atomic Lua check-and-delete.
 * Only deletes the lock if the stored value matches the owner UUID.
 *
 * @param owner - The UUID returned by tryAcquireLock, or null if no lock was held
 */
async function releaseLock(owner: string | null): Promise<void> {
  if (!owner) return;

  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.eval(RELEASE_SCRIPT, [LOCK_KEY], [owner]);
  } catch (error) {
    logger.error({ err: error }, 'Failed to release Redis lock');
  }
}

/**
 * POST /api/cron/notifications-cleanup
 *
 * Scheduled endpoint to purge notifications older than configured retention periods.
 * Prevents unbounded table growth in the notification table.
 *
 * Retention policy:
 * - Read notifications: deleted after 30 days (configurable via NOTIFICATION_RETENTION_READ_DAYS)
 * - Unread notifications: deleted after 90 days (configurable via NOTIFICATION_RETENTION_UNREAD_DAYS)
 *
 * Auth: Bearer token matching CRON_SECRET env var (timing-safe comparison).
 * Returns: { deletedReadCount, deletedUnreadCount, totalDeleted }
 */
export async function POST(request: Request) {
  // Verify Bearer auth via shared timing-safe utility
  const auth = verifyCronAuth(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Try to acquire lock to prevent overlapping runs
  const { acquired, owner } = await tryAcquireLock();
  if (!acquired) {
    logger.info('Notification cleanup skipped - another instance is running');
    return NextResponse.json({
      skipped: true,
      reason: 'Another instance is running',
    });
  }

  try {
    // Get retention settings from env (coerced numbers, defaults: 30 days read, 90 days unread)
    const readRetentionDays = env().NOTIFICATION_RETENTION_READ_DAYS ?? 30;
    const unreadRetentionDays = env().NOTIFICATION_RETENTION_UNREAD_DAYS ?? 90;
    const batchSize = env().NOTIFICATION_CLEANUP_BATCH_SIZE ?? 1000;

    logger.info(
      { readRetentionDays, unreadRetentionDays, batchSize },
      'Starting notification cleanup',
    );

    const result = await purgeOldNotifications({
      readRetentionDays,
      unreadRetentionDays,
      batchSize,
    });

    logger.info(
      { ...result, readRetentionDays, unreadRetentionDays },
      'Notification cleanup completed',
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Notification cleanup failed');
    return NextResponse.json(
      { error: 'Failed to cleanup notifications' },
      { status: 500 },
    );
  } finally {
    // Always release lock (owner-checked via Lua script)
    await releaseLock(owner);
  }
}
