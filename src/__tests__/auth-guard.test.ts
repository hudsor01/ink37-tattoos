import { describe, it, expect, vi, beforeEach } from 'vitest';

// Per-file mocks declared before importing the module under test so the
// import sees the mocked versions. requireAuthSession's dependencies
// (getCurrentSession, headers, logger) are stubbed so we can drive each
// branch of the kernel deterministically.
const mockGetCurrentSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentSession: () => mockGetCurrentSession(),
}));

const mockHeadersGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: mockHeadersGet }),
}));

const mockLoggerError = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

import { isFrameworkSignal, requireAuthSession } from '@/lib/auth-guard';

/**
 * isFrameworkSignal is the typeguard the AuthGuard catch arms (and
 * route handlers like src/app/api/admin/calendar/route.ts) use to
 * decide whether to re-throw or treat an error as a real failure.
 *
 * Getting it wrong has two failure modes:
 *   - Too narrow → swallows framework signals → broken prerender,
 *     swallowed redirect(), 500s where the user expected 401/404.
 *     This is the bug iteration-1 introduced and discovered at build
 *     time.
 *   - Too broad → re-throws real errors → 500s instead of the
 *     fallback redirect.
 *
 * The structural check (digest property + string type) is the
 * convention shared with Next's own private isHangingPromiseRejection-
 * Error / isRedirectError helpers. Tests here pin that contract.
 */
describe('isFrameworkSignal', () => {
  it('matches Next.js framework signals carrying a string digest', () => {
    expect(
      isFrameworkSignal(
        Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
      )
    ).toBe(true);

    expect(
      isFrameworkSignal(
        Object.assign(new Error('not found'), { digest: 'NEXT_NOT_FOUND' })
      )
    ).toBe(true);

    expect(
      isFrameworkSignal(
        Object.assign(new Error('unauthorized'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;401' })
      )
    ).toBe(true);

    expect(
      isFrameworkSignal(
        Object.assign(new Error('forbidden'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;403' })
      )
    ).toBe(true);

    // Cache Components prerender-abort sentinel
    expect(
      isFrameworkSignal(
        Object.assign(new Error('hanging promise'), { digest: 'HANGING_PROMISE_REJECTION' })
      )
    ).toBe(true);
  });

  it('does NOT match real errors that lack a digest', () => {
    expect(isFrameworkSignal(new Error('database timeout'))).toBe(false);
    expect(isFrameworkSignal(new TypeError('bad arg'))).toBe(false);
    expect(isFrameworkSignal(new RangeError('out of range'))).toBe(false);
  });

  it('does NOT match plain values', () => {
    expect(isFrameworkSignal(null)).toBe(false);
    expect(isFrameworkSignal(undefined)).toBe(false);
    expect(isFrameworkSignal('NEXT_REDIRECT')).toBe(false);
    expect(isFrameworkSignal(42)).toBe(false);
    expect(isFrameworkSignal({})).toBe(false);
  });

  it('does NOT match objects with a non-string digest', () => {
    // Defensive: someone could attach a numeric digest by accident.
    // The structural check should require string typing to avoid
    // matching unrelated objects that happen to have a `digest` field.
    expect(isFrameworkSignal({ digest: 123 })).toBe(false);
    expect(isFrameworkSignal({ digest: null })).toBe(false);
    expect(isFrameworkSignal({ digest: undefined })).toBe(false);
    expect(isFrameworkSignal({ digest: { nested: 'NEXT_REDIRECT' } })).toBe(false);
  });

  it('matches plain objects with a string digest (digest is the contract, not Error inheritance)', () => {
    // Next throws plain objects in some paths; the typeguard is
    // structural, not nominal.
    expect(isFrameworkSignal({ digest: 'NEXT_REDIRECT;...' })).toBe(true);
  });

  it('survives a digest accessor that throws (defensive, never explodes the catch arm)', () => {
    // If a third-party throw or a future Next minor defines `digest`
    // as a getter that raises, the typeguard must still return false
    // rather than re-throwing -- otherwise the catch block becomes a
    // landmine that crashes on a malformed error object.
    const evilError = {};
    Object.defineProperty(evilError, 'digest', {
      get() {
        throw new Error('boom from getter');
      },
      enumerable: true,
    });
    expect(isFrameworkSignal(evilError)).toBe(false);
  });
});

/**
 * requireAuthSession is the AuthGuard kernel — both protected segments
 * (dashboard + portal) call it. A regression here lands silently
 * because the layouts trust the helper. Tests cover all six branches:
 *
 *   1. Successful session → returns the session unchanged.
 *   2. No session + safe x-pathname → redirects with the path preserved.
 *   3. Missing x-pathname → redirects with the fallbackPath.
 *   4. Unsafe x-pathname (e.g., //evil.com) → redirects with the fallback.
 *   5. getCurrentSession throws a framework signal → re-throws as-is.
 *   6. getCurrentSession throws a real error → logs with route + tag,
 *      then redirects (does NOT re-throw, does NOT 500).
 *
 * redirect() throws NEXT_REDIRECT; we catch that throw to inspect the
 * URL it was called with rather than letting the test runner trip on it.
 */
describe('requireAuthSession', () => {
  beforeEach(() => {
    mockGetCurrentSession.mockReset();
    mockHeadersGet.mockReset();
    mockLoggerError.mockReset();
  });

  it('returns the session when authenticated', async () => {
    const fakeSession = { user: { id: 'u1', role: 'admin' }, session: { id: 's1' } };
    mockGetCurrentSession.mockResolvedValue(fakeSession);

    const result = await requireAuthSession({
      routeTag: 'test',
      fallbackPath: '/dashboard',
    });
    expect(result).toBe(fakeSession);
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('redirects with the captured x-pathname when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    mockHeadersGet.mockReturnValue('/dashboard/orders/123');

    await expect(
      requireAuthSession({ routeTag: 'test', fallbackPath: '/dashboard' })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/NEXT_REDIRECT.*\/login\?callbackUrl=%2Fdashboard%2Forders%2F123/),
    });
  });

  it('uses the fallbackPath when x-pathname is missing', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    mockHeadersGet.mockReturnValue(null);

    await expect(
      requireAuthSession({ routeTag: 'test', fallbackPath: '/portal' })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/NEXT_REDIRECT.*\/login\?callbackUrl=%2Fportal/),
    });
  });

  it('uses the fallbackPath when x-pathname is unsafe (open-redirect vector)', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    mockHeadersGet.mockReturnValue('//evil.com/path');

    await expect(
      requireAuthSession({ routeTag: 'test', fallbackPath: '/dashboard' })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/NEXT_REDIRECT.*\/login\?callbackUrl=%2Fdashboard/),
    });
  });

  it('re-throws Next.js framework signals from getCurrentSession (does NOT log, does NOT redirect)', async () => {
    const signal = Object.assign(new Error('signal'), {
      digest: 'HANGING_PROMISE_REJECTION',
    });
    mockGetCurrentSession.mockRejectedValue(signal);

    await expect(
      requireAuthSession({ routeTag: 'test', fallbackPath: '/dashboard' })
    ).rejects.toBe(signal);

    expect(mockLoggerError).not.toHaveBeenCalled();
    expect(mockHeadersGet).not.toHaveBeenCalled();
  });

  it('logs and redirects when getCurrentSession throws a real error', async () => {
    const realError = new Error('database timeout');
    mockGetCurrentSession.mockRejectedValue(realError);
    mockHeadersGet.mockReturnValue('/dashboard');

    await expect(
      requireAuthSession({ routeTag: 'dashboard.AuthGuard', fallbackPath: '/dashboard' })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/NEXT_REDIRECT/),
    });

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: realError,
        route: 'dashboard.AuthGuard',
        handled_via: 'authguard_fallback',
      }),
      expect.any(String)
    );
  });
});
