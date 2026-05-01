import { describe, it, expect } from 'vitest';
import { isFrameworkSignal } from '@/lib/auth-guard';

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
});
