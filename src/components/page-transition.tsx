'use client';

import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Wraps children in a fade/slide page transition using framer-motion.
 * Uses LazyMotion + domAnimation for tree-shaking (smaller bundle than full motion).
 *
 * `initial={false}` on AnimatePresence is load-bearing, not cosmetic.
 *
 * Without it, framer-motion renders the `initial` variant into the SSR
 * markup, so the server ships `style="opacity:0;transform:translateY(8px)"`
 * and the content only becomes visible once hydration runs `animate`. That
 * makes EVERY public page a blank screen whenever client JS fails to
 * execute -- a blocked script, a chunk 404 mid-deploy, a browser that chokes
 * on a bundle. The site was down exactly this way once already (a CSP
 * `'strict-dynamic'` directive blocked every /_next chunk; see the comment
 * block in src/proxy.ts), and the failure was invisible: fully-formed DOM,
 * correct HTML, zero visible text.
 *
 * With `initial={false}`, framer's makeLatestValues() resolves
 * `variantToSet = animate` for the first mount, so the server-rendered
 * markup is the *settled* state (`opacity: 1`). Content is readable with no
 * JS at all, and route-change transitions still animate normally because
 * only the first mount is treated as non-initial.
 *
 * Net: a JS failure now degrades to "no page transition" instead of
 * "invisible website". Do not remove this prop.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
