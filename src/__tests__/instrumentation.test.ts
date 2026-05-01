import { describe, it, expect } from 'vitest';
import type * as Sentry from '@sentry/nextjs';
import { dropFrameworkSignals } from '@/instrumentation';

/**
 * Pins the Sentry beforeSend filter that drops Next.js framework
 * signals so we don't pollute the dashboard with control-flow throws.
 *
 * Why this test matters: iteration 5 added 'HANGING_PROMISE_REJECTION'
 * to ignoreErrors, but Sentry only substring-matches against
 * `event.message` / `lastException.value` / `${type}: ${value}` -- it
 * does NOT inspect `error.digest`. The HangingPromiseRejectionError
 * class has a long human-readable message (constructor in
 * node_modules/next/dist/server/dynamic-rendering-utils.js:43-45) so
 * the iteration-5 string filter was dead code. The beforeSend hook
 * checks hint.originalException.digest directly, which is the
 * reliable contract. Tests here pin that the right errors are
 * dropped (return null) and unrelated errors are forwarded (return
 * event).
 */
describe('dropFrameworkSignals (Sentry beforeSend hook)', () => {
  const event = { event_id: 'test-event' } as unknown as Sentry.ErrorEvent;

  function hintWith(digest: unknown): Sentry.EventHint {
    return {
      originalException: digest === undefined
        ? new Error('plain error')
        : Object.assign(new Error('with digest'), { digest }),
    } as Sentry.EventHint;
  }

  it('drops Cache Components prerender aborts', () => {
    expect(dropFrameworkSignals(event, hintWith('HANGING_PROMISE_REJECTION'))).toBeNull();
  });

  it('drops redirect() throws', () => {
    expect(
      dropFrameworkSignals(event, hintWith('NEXT_REDIRECT;replace;/login;307;'))
    ).toBeNull();
  });

  it('drops notFound() throws', () => {
    expect(dropFrameworkSignals(event, hintWith('NEXT_NOT_FOUND'))).toBeNull();
  });

  it('drops unauthorized() / forbidden() throws', () => {
    expect(
      dropFrameworkSignals(event, hintWith('NEXT_HTTP_ERROR_FALLBACK;401'))
    ).toBeNull();
    expect(
      dropFrameworkSignals(event, hintWith('NEXT_HTTP_ERROR_FALLBACK;403'))
    ).toBeNull();
  });

  it('forwards real errors with no digest', () => {
    expect(dropFrameworkSignals(event, hintWith(undefined))).toBe(event);
  });

  it('forwards errors with a non-string digest (defensive)', () => {
    expect(dropFrameworkSignals(event, hintWith(42))).toBe(event);
    expect(dropFrameworkSignals(event, hintWith(null))).toBe(event);
  });

  it('forwards errors with a digest that does not match a known signal', () => {
    expect(dropFrameworkSignals(event, hintWith('SOME_OTHER_DIGEST'))).toBe(event);
  });

  it('forwards when the originalException is missing entirely', () => {
    expect(dropFrameworkSignals(event, {} as Sentry.EventHint)).toBe(event);
  });
});
