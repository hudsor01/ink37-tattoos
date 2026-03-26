'use client';

import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Wraps children in a fade/slide page transition using framer-motion.
 * Uses LazyMotion + domAnimation for tree-shaking (smaller bundle than full motion).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
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
