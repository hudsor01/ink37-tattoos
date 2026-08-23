import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// PageTransition only needs a stable pathname to key the AnimatePresence
// child. The global setup.ts mock keeps the real next/navigation (for its
// framework-signal contract), which has no router context under
// renderToStaticMarkup -- so pin usePathname for this file only.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { PageTransition } from '@/components/page-transition';

/**
 * Regression test for the "entire site renders blank" outage.
 *
 * framer-motion writes the `initial` variant into server-rendered markup.
 * With PageTransition wrapping every public page, that meant the SSR HTML
 * shipped `style="opacity:0;transform:translateY(8px)"` and the site was
 * only ever made visible by hydration running `animate`. Any failure to
 * execute client JS therefore produced a fully-formed DOM with zero visible
 * text -- which is exactly what a CSP `'strict-dynamic'` directive caused in
 * production (see src/proxy.ts).
 *
 * `initial={false}` on AnimatePresence makes framer resolve the first mount
 * to the `animate` variant instead, so the server ships the settled, visible
 * state. These assertions fail if that prop is ever removed.
 */
describe('PageTransition server-rendered visibility', () => {
  const markup = () =>
    renderToStaticMarkup(
      <PageTransition>
        <p>sentinel page content</p>
      </PageTransition>
    );

  it('renders its children into the server markup', () => {
    expect(markup()).toContain('sentinel page content');
  });

  it('does NOT server-render an opacity:0 wrapper (blank-page regression)', () => {
    // Matches opacity:0 / opacity: 0 but not opacity:0.5 or opacity:0.25
    expect(markup()).not.toMatch(/opacity:\s*0(?![.\d])/);
  });

  it('does NOT server-render a translated/hidden wrapper', () => {
    expect(markup()).not.toMatch(/translateY\(8px\)/);
  });
});
