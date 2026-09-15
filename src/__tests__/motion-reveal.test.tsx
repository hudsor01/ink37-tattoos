// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

/**
 * RUNTIME coverage for `whileInView` scroll reveals.
 *
 * The existing guards (page-transition.test.tsx, public-hydration-gate.test.tsx)
 * assert SERVER-rendered markup only. They cannot see runtime behavior, so a
 * framer-motion change that stops IntersectionObserver reveals from firing
 * passes every one of them -- the elements still SSR with `opacity: 0`, which
 * is exactly what those tests demand.
 *
 * That gap is not hypothetical: it is why a framer-motion 13 bump reached a
 * green CI run while `/contact` sections sat at `opacity: 0` inside the
 * viewport on the preview deploy (PR #110). This file closes it.
 *
 * 19 elements across about/services/contact depend on this behavior. They all
 * use the same shape, mirrored below:
 *
 *   <motion.section initial="hidden" whileInView="visible"
 *                   viewport={{ once: true }} variants={fadeInUp} />
 */

/** Matches contact-client.tsx / services-client.tsx / about-client.tsx. */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

type IOCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

/**
 * jsdom ships no IntersectionObserver. This stub records every observer the
 * component tree creates so a test can drive intersection explicitly, which is
 * the only way to exercise `whileInView` deterministically.
 */
const observers: Array<{ cb: IOCallback; elements: Element[] }> = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly scrollMargin = '';
  readonly thresholds: readonly number[] = [0];
  private entry: { cb: IOCallback; elements: Element[] };

  constructor(cb: IOCallback) {
    this.entry = { cb, elements: [] };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.elements.push(el);
  }
  unobserve(el: Element) {
    this.entry.elements = this.entry.elements.filter((e) => e !== el);
  }
  disconnect() {
    this.entry.elements = [];
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Fire `isIntersecting: true` for every element currently observed. */
function scrollEverythingIntoView() {
  for (const o of [...observers]) {
    const entries = o.elements.map(
      (target) =>
        ({
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: 0,
        }) as unknown as IntersectionObserverEntry
    );
    if (entries.length) o.cb(entries, {} as IntersectionObserver);
  }
}

/**
 * Installed at module scope, BEFORE framer-motion is imported, and never torn
 * down. Both details are load-bearing: framer caches one IntersectionObserver
 * per (root, options) in a module-level WeakMap and reuses it for the lifetime
 * of the module. Stubbing per-test (or clearing this registry in beforeEach)
 * orphans that cached instance -- the second test onward would reuse an
 * observer this file no longer has a handle on, and every reveal assertion
 * would fail for a reason that has nothing to do with the component.
 */
globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

const { motion } = await import('framer-motion');

function opacityOf(el: Element): number {
  const inline = (el as HTMLElement).style.opacity;
  return inline === '' ? 1 : parseFloat(inline);
}

describe('whileInView scroll reveals (runtime)', () => {
  beforeEach(() => {
    // Drop stale element handles but KEEP the observer objects themselves --
    // framer holds cached references to them (see the note above).
    for (const o of observers) o.elements = [];
  });

  it('starts hidden before the element enters the viewport', () => {
    const { container } = render(
      <motion.section
        data-testid="reveal"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <p>reveal content</p>
      </motion.section>
    );
    const el = container.querySelector('[data-testid="reveal"]')!;
    expect(el).toBeTruthy();
    // The hidden initial state IS the reveal -- if this ever becomes visible
    // at mount, the animation has been gated away (the mistake
    // `<AnimatePresence initial={false}>` made).
    expect(opacityOf(el)).toBe(0);
  });

  /**
   * THE regression guard. If framer stops honoring whileInView, this fails
   * while every SSR-only test stays green.
   */
  it('becomes visible once IntersectionObserver reports it in view', async () => {
    const { container } = render(
      <motion.section
        data-testid="reveal"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <p>reveal content</p>
      </motion.section>
    );
    const el = container.querySelector('[data-testid="reveal"]')!;
    expect(opacityOf(el)).toBe(0);

    // framer must have registered an observer for whileInView to work at all.
    expect(observers.length).toBeGreaterThan(0);

    act(() => scrollEverythingIntoView());

    // waitFor, not a fixed sleep. The assertion is satisfied as soon as the
    // animation STARTS -- a few frames after the observer fires -- so sleeping
    // past the 0.6s duration only burned wall-clock on every run, and would
    // have flipped to a flake if framer ever scheduled the start later than
    // the hardcoded wait.
    await waitFor(() => expect(opacityOf(el)).toBeGreaterThan(0), {
      timeout: 1500,
    });
  });

  it('reveals a staggered container and its children', async () => {
    const { container } = render(
      <motion.div
        data-testid="container"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
        }}
      >
        <motion.div data-testid="child" variants={fadeInUp}>
          child
        </motion.div>
      </motion.div>
    );
    const parent = container.querySelector('[data-testid="container"]')!;
    expect(opacityOf(parent)).toBe(0);

    const child = container.querySelector('[data-testid="child"]')!;
    expect(opacityOf(child)).toBe(0);

    act(() => scrollEverythingIntoView());

    await waitFor(() => expect(opacityOf(parent)).toBeGreaterThan(0), {
      timeout: 1500,
    });
    // The child assertion is the point of this case -- the parent revealing
    // proves nothing about variant inheritance or staggerChildren. Without
    // it, a regression that left staggered children hidden would pass a test
    // literally named "and its children".
    await waitFor(() => expect(opacityOf(child)).toBeGreaterThan(0), {
      timeout: 1500,
    });
  });
});
