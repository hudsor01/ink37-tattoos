import { NextResponse } from 'next/server';
import { purgeOldNotifications } from '@/lib/dal/notifications';
import { logger } from '@/lib/logger';
import { Redis } from '@upstash/redis';

const LOCK_KEY = 'lock:notification-cleanup';
const LOCK_TTL_SECONDS = 300; // 5 minutes max lock time (prevent stale locks)

/**
 * Try to acquire a distributed lock in Redis.
 * Returns true if lock acquired, false if already locked.
 */
async function tryAcquireLock(): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // No Redis configured - allow execution but log warning
    logger.warn('Upstash Redis not configured - running cleanup without overlap prevention');
    return true;
  }

  try {
    const redis = new Redis({ url, token });
    // SET NX EX = set if not exists with expiration
    const result = await redis.set(LOCK_KEY, 'locked', { nx: true, ex: LOCK_TTL_SECONDS });
    return result === 'OK';
  } catch (error) {
    logger.error({ err: error }, 'Failed to acquire Redis lock - allowing cleanup to proceed');
    return true; // Fail open - allow cleanup to proceed
  }
}

/**
 * Release the distributed lock.
 */
async function releaseLock(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return;

  try {
    const redis = new Redis({ url, token });
    await redis.del(LOCK_KEY);
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
 * Auth: Bearer token matching CRON_SECRET env var.
 * Returns: { deletedReadCount, deletedUnreadCount, totalDeleted }
 */
export async function POST(request: Request) {
  // Verify CRON_SECRET is configured
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  // Verify Bearer auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Try to acquire lock to prevent overlapping runs
  const lockAcquired = await tryAcquireLock();
  if (!lockAcquired) {
    logger.info('Notification cleanup skipped - another instance is running');
    return NextResponse.json({
      skipped: true,
      reason: 'Another instance is running',
    });
  }

  try {
    // Get retention settings from env (defaults: 30 days read, 90 days unread)
    const readRetentionDays = parseInt(process.env.NOTIFICATION_RETENTION_READ_DAYS || '30', 10);
    const unreadRetentionDays = parseInt(process.env.NOTIFICATION_RETENTION_UNREAD_DAYS || '90', 10);
    const batchSize = parseInt(process.env.NOTIFICATION_CLEANUP_BATCH_SIZE || '1000', 10);

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
      { status: 500 }
    );
  } finally {
    // Always release lock
    await releaseLock();
  }
}
