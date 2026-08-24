import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import ContactClient from '@/components/public/contact-client';
import AboutClient from '@/components/public/about-client';
import ServicesClient from '@/components/public/services-client';
import FaqClient from '@/components/public/faq-client';
import { HeroSection } from '@/components/public/hero-section';

/**
 * Counts inline `opacity: 0` declarations. The value must END at 0 --
 * `\bopacity:\s*0\b` also matches `opacity:0.5`, because `0` and `.` form a
 * word boundary.
 */
function hiddenCount(html: string): number {
  return (html.match(/style="[^"]*opacity:\s*0\s*(?:[;"])/g) ?? []).length;
}

/** Inline style of the outermost element, or '' when it carries none. */
function rootStyle(html: string): string {
  return html.match(/^<[a-z]+[^>]*?\sstyle="([^"]*)"/)?.[1] ?? '';
}

/**
 * The blank-page class, at the level it actually bites.
 *
 * framer-motion writes the resolved "initial" variant into SSR markup, so a
 * plain `initial={{ opacity: 0 }}` ships invisible content that only hydration
 * reveals -- which is how a CSP directive rendered the entire site blank with
 * a fully-formed DOM. PageTransition was gated first; these are the remaining
 * mount-animated wrappers, now gated through the shared useHydrated() hook.
 *
 * Both directions are asserted on purpose:
 *   - the mount-animated ROOT must be visible (the gate works), and
 *   - the whileInView descendants must STAY hidden (the scroll reveals still
 *     work).
 * Only checking the first would let a future "just gate everything" change
 * silently kill every scroll animation -- exactly what
 * `<AnimatePresence initial={false}>` did when it was tried.
 */
describe('public components server-render their mount-animated root visible', () => {
  it.each([
    ['HeroSection', () => renderToStaticMarkup(<HeroSection />)],
    ['FaqClient', () => renderToStaticMarkup(<FaqClient />)],
    ['ContactClient', () => renderToStaticMarkup(<ContactClient />)],
    ['AboutClient', () => renderToStaticMarkup(<AboutClient />)],
    ['ServicesClient', () => renderToStaticMarkup(<ServicesClient />)],
  ])('%s root is not transparent', (_name, render) => {
    const html = render();
    expect(html.length).toBeGreaterThan(500);
    const style = rootStyle(html);
    // Absent opacity means the browser default of 1, which is visible.
    const opacity = parseFloat(
      style.match(/(?:^|;)\s*opacity:\s*([\d.]+)/)?.[1] ?? '1'
    );
    expect(opacity).toBeGreaterThan(0);
  });

  it('HeroSection and FaqClient have no hidden elements at all', () => {
    // Neither uses whileInView, so nothing should ship hidden.
    expect(hiddenCount(renderToStaticMarkup(<HeroSection />))).toBe(0);
    expect(hiddenCount(renderToStaticMarkup(<FaqClient />))).toBe(0);
  });

  /**
   * Scroll-reveal guard. These counts are the whileInView subtrees; they must
   * stay non-zero. A drop to 0 means someone gated whileInView elements too,
   * which renders them with no opacity and stops their scroll animation from
   * ever firing.
   */
  it.each([
    ['ContactClient', () => renderToStaticMarkup(<ContactClient />)],
    ['AboutClient', () => renderToStaticMarkup(<AboutClient />)],
    ['ServicesClient', () => renderToStaticMarkup(<ServicesClient />)],
  ])('%s keeps its whileInView reveals hidden', (_name, render) => {
    expect(hiddenCount(render())).toBeGreaterThan(0);
  });
});
