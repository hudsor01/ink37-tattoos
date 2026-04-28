/**
 * Global test setup for vitest.
 *
 * These mocks apply to all test files. Individual test files can override
 * specific mocks with their own vi.mock() calls (per-file mocks take precedence).
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// @upstash/ratelimit + @upstash/redis -- not available in CI without env vars.
// Must be mocked before any module imports rate-limiter.ts.
// ---------------------------------------------------------------------------
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  })),
}));
vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn() },
}));

// ---------------------------------------------------------------------------
// next/cache -- revalidatePath/revalidateTag require Next.js request context
// (static generation store) which doesn't exist in vitest.
// ---------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: unknown) => fn),
}));

// ---------------------------------------------------------------------------
// next/navigation -- forbidden() / unauthorized() throw NEXT_HTTP_ERROR_FALLBACK
// at runtime; mock as throws so DAL tests can assert on them.
// ---------------------------------------------------------------------------
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT: ${url}`);
    }),
    forbidden: vi.fn(() => {
      throw new Error('NEXT_HTTP_ERROR_FALLBACK;403');
    }),
    unauthorized: vi.fn(() => {
      throw new Error('NEXT_HTTP_ERROR_FALLBACK;401');
    }),
  };
});

// ---------------------------------------------------------------------------
// next/headers -- headers() and cookies() require Next.js request context.
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Headers([
      ['x-forwarded-for', '127.0.0.1'],
      ['user-agent', 'test'],
    ])
  ),
  cookies: vi.fn().mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// next/server -- after() requires async context, connection() needs request.
// ---------------------------------------------------------------------------
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
  connection: vi.fn(),
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// ---------------------------------------------------------------------------
// DAL audit -- logAudit is used widely via after() callbacks.
// ---------------------------------------------------------------------------
vi.mock('@/lib/dal/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// DAL notifications -- createNotificationForAdmins called from contact action.
// ---------------------------------------------------------------------------
vi.mock('@/lib/dal/notifications', () => ({
  createNotificationForAdmins: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// DAL consent -- getActiveConsentForm called from portal-actions.
// ---------------------------------------------------------------------------
vi.mock('@/lib/dal/consent', () => ({
  getActiveConsentForm: vi.fn().mockResolvedValue({ version: 1 }),
}));
