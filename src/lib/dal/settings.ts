import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { forbidden, unauthorized } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const STAFF_ROLES = ['staff', 'manager', 'admin', 'super_admin'];
const ADMIN_ROLES = ['admin', 'super_admin'];

async function requireStaffRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!STAFF_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

async function requireAdminRole() {
  const session = await getCurrentSession();
  if (!session?.user) unauthorized();
  if (!ADMIN_ROLES.includes(session.user.role)) {
    forbidden();
  }
  return session;
}

// ============================================================================
// TTL CACHE
// ============================================================================

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = settingsCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    settingsCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  settingsCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate the entire settings cache.
 * Call this after mutations or when fresh data is needed.
 */
export function invalidateSettingsCache(): void {
  settingsCache.clear();
}

// ============================================================================
// QUERIES
// ============================================================================

export const getSettings = cache(async (category?: string) => {
  await requireStaffRole();

  const cacheKey = `settings:list:${category ?? '__all__'}`;
  const cached = getCached<Awaited<ReturnType<typeof db.query.settings.findMany>>>(cacheKey);
  if (cached) return cached;

  const result = await db.query.settings.findMany({
    where: category ? eq(schema.settings.category, category) : undefined,
    orderBy: [asc(schema.settings.key)],
  });

  setCached(cacheKey, result);
  return result;
});

export const getSettingByKey = cache(async (key: string) => {
  await requireStaffRole();

  const cacheKey = `settings:key:${key}`;
  const cached = getCached<Awaited<ReturnType<typeof db.query.settings.findFirst>>>(cacheKey);
  if (cached !== undefined) return cached;

  const result = await db.query.settings.findFirst({
    where: eq(schema.settings.key, key),
  });

  if (result) setCached(cacheKey, result);
  return result;
});

// ============================================================================
// MUTATIONS
// ============================================================================

export async function upsertSetting(data: {
  key: string;
  value: unknown;
  category: string;
  description?: string;
}) {
  await requireAdminRole();
  const [result] = await db.insert(schema.settings).values({
    key: data.key,
    value: data.value as object,
    category: data.category,
    description: data.description,
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: {
      value: data.value as object,
      category: data.category,
      description: data.description,
    },
  }).returning();
  if (!result) throw new Error('Failed to upsert setting: no result returned');

  // Invalidate cache after mutation so subsequent reads get fresh data
  invalidateSettingsCache();

  return result;
}
