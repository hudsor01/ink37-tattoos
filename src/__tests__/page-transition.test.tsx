import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { m } from 'framer-motion';

// PageTransition only needs a stable pathname to key the AnimatePresence
// child. The global setup.ts mock keeps the real next/navigation (for its
// framework-signal contract), which has no router context under
// renderToStaticMarkup -- so pin usePathname for this file only.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { PageTransition } from '@/components/page-transition';

/**
 * Parses the inline style of the OUTERMOST element in a render.
 *
 * Deliberately not a regex over the whole document. A document-wide
 * `/opacity:\s*0/` scan is wrong in both directions, verified:
 *   false positives - matches `fill-opacity:0`, `stroke-opacity: 0`,
 *                     `--tw-bg-opacity:0` on any unrelated descendant
 *   false negatives - misses `opacity:0.0`, so changing the variant to
 *                     `{ opacity: 0.0 }` would leave a blank page green
 * and the positive `/opacity:\s*1/` form is satisfied by `fill-opacity:1`
 * on any child, so it can pass while the wrapper itself sits at 0.
 *
 * Reading the wrapper's own declarations and comparing numerically removes
 * every one of those failure modes.
 */
function wrapperStyle(html: string): Record<string, string> {
  const attr = html.match(/^<div[^>]*?\sstyle="([^"]*)"/)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const decl of attr.split(';')) {
    if (!decl.trim()) continue;
    const [prop, ...rest] = decl.split(':');
    out[prop.trim()] = rest.join(':').trim();
  }
  return out;
}

/**
 * Regression test for the "entire site renders blank" outage.
 *
 * framer-motion writes whichever variant it resolves as "initial" into the
 * server-rendered markup. With a plain `initial={{ opacity: 0 }}`,
 * PageTransition wrapped every public page in
 * `style="opacity:0;transform:translateY(8px)"`, so the content was only ever
 * revealed by hydration running `animate`. When a CSP `'strict-dynamic'`
 * directive blocked every /_next chunk, React never hydrated and the site
 * rendered as a fully-formed DOM with zero visible text (see src/proxy.ts).
 *
 * Gating `initial` on hydration makes framer resolve the first mount to the
 * `animate` variant, so the server ships the settled, visible state.
 */
describe('PageTransition server-rendered visibility', () => {
  /**
   * Asserts the component actually produced markup before returning it.
   * Every check below is a negative assertion, and a negative assertion is
   * vacuously true against an empty string -- if PageTransition ever rendered
   * nothing, the guards would silently pass on a blank page.
   */
  const markup = () => {
    const html = renderToStaticMarkup(
      <PageTransition>
        <p>sentinel page content</p>
      </PageTransition>
    );
    expect(html).toContain('sentinel page content');
    return html;
  };

  it('renders its children into the server markup', () => {
    expect(markup()).toContain('sentinel page content');
  });

  it('server-renders the wrapper visible, not transparent', () => {
    const style = wrapperStyle(markup());
    // Absent opacity means the browser default of 1, which is also visible.
    const opacity = parseFloat(style.opacity ?? '1');
    expect(Number.isNaN(opacity)).toBe(false);
    expect(opacity).toBeGreaterThan(0);
  });

  it('server-renders the wrapper unoffset (no translate)', () => {
    const style = wrapperStyle(markup());
    // Catches translateY(8px) and any other offset a future edit introduces,
    // rather than hardcoding the current `y: 8`.
    expect(style.transform ?? 'none').not.toMatch(/translate/i);
  });

  /**
   * Scoping guard. The obvious spelling of this fix is
   * `<AnimatePresence initial={false}>`, which is subtly wrong: it sets
   * PresenceContext.initial, and React propagates that to EVERY descendant
   * motion component. The whileInView scroll reveals in about/services/
   * contact-client then resolve `variantToSet = animate` (undefined for
   * them), render with no opacity, and stop animating on scroll entirely --
   * verified live, below-fold elements sat at opacity:1 before ever entering
   * the viewport.
   *
   * Gating `initial` on this one element instead leaves descendants alone.
   * A descendant that declares its own hidden initial state must still get
   * it -- if this starts failing, the suppression has leaked back into the
   * subtree and the reveal animations are silently dead.
   */
  it('does not suppress descendant motion components (scroll-reveal guard)', () => {
    const html = renderToStaticMarkup(
      <PageTransition>
        <m.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
          <p>descendant reveal content</p>
        </m.div>
      </PageTransition>
    );
    expect(html).toContain('descendant reveal content');

    // The wrapper stays visible...
    expect(parseFloat(wrapperStyle(html).opacity ?? '1')).toBeGreaterThan(0);
    // ...while the descendant keeps its own hidden initial state.
    expect(html).toMatch(/<div[^>]*style="[^"]*\bopacity:\s*0\b/);
  });
});
