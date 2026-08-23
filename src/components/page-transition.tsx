'use client';

import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

/**
 * Wraps children in a fade/slide page transition using framer-motion.
 * Uses LazyMotion + domAnimation for tree-shaking (smaller bundle than full motion).
 *
 * The `hydrated` gate on `initial` is load-bearing, not cosmetic.
 *
 * framer-motion renders whichever variant it resolves as "initial" into the
 * SSR markup. With a plain `initial={{ opacity: 0 }}`, the server shipped
 * `style="opacity:0;transform:translateY(8px)"` around every public page, so
 * the site was only ever made visible by hydration running `animate`. Any
 * failure to execute client JS therefore produced a fully-formed DOM with
 * zero visible text. That is exactly how a CSP `'strict-dynamic'` directive
 * took the whole site down (see the comment block in src/proxy.ts).
 *
 * `hydrated` is false on the server AND during hydration (useSyncExternalStore
 * returns the server snapshot until hydration completes), so the two agree and
 * there is no hydration mismatch. It is deliberately NOT a useState +
 * useEffect(setState) pair -- that trips react-hooks/set-state-in-effect and
 * causes the cascading render the rule warns about. framer's makeLatestValues()
 * treats `initial === false` as "initial animation blocked" and resolves
 * `variantToSet = animate`, so the server ships the settled, visible state
 * (`opacity: 1`). Once hydration completes the store switches to the client
 * snapshot, so every subsequent route change mounts a fresh keyed child that
 * fades in normally.
 *
 * Deliberately NOT `<AnimatePresence initial={false}>`, which looks
 * equivalent and is the more obvious spelling. That sets
 * `PresenceContext.initial`, which React-propagates to EVERY descendant
 * motion component -- including the `whileInView` scroll reveals in
 * about/services/contact-client. Those resolve `variantToSet = animate`,
 * which is undefined for them, so they render with no opacity at all and
 * their scroll-in animations silently stop firing (verified: below-fold
 * elements sat at opacity:1 before ever entering the viewport). Keeping the
 * gate on this one element confines the change to the page wrapper.
 *
 * Net: a partial JS failure degrades to "no page transition" instead of
 * "invisible website", and the descendant reveal animations are untouched.
 *
 * SCOPE -- do not oversell this as a no-JS guarantee. Two limits:
 *
 * 1. Under `cacheComponents: true` the prerendered shell is head/metadata
 *    only; the page body arrives as streamed Suspense content that React
 *    swaps in with its own inline scripts. With client JS fully disabled the
 *    body stays empty regardless of what this component renders.
 *
 * 2. This gate covers THIS wrapper only. Several page components still
 *    server-render their own `opacity: 0` and depend on hydration to reveal
 *    it -- notably contact-client.tsx:61, which wraps the whole of /contact
 *    in `initial={{ opacity: 0, y: 20 }}` + `animate`, plus hero wrappers in
 *    faq-client, services-client, about-client, home-client and every tile in
 *    gallery-grid. If client JS stops executing again, those routes go blank
 *    exactly as before; only this wrapper degrades cleanly.
 *
 * Fixing that class properly means sharing the hydration gate below as a
 * `useHydrated()` hook and applying it there too -- which trades away their
 * first-load entrance animations, a visible design change, so it is left as a
 * deliberate decision rather than folded in here.
 *
 * What this gate DOES buy is precisely the failure that took the site down:
 * React's nonce'd inline scripts ran and placed real content in the DOM
 * (measured on production: 4322 chars inside this wrapper), while the
 * un-nonced /_next chunks never executed -- so framer never animated and that
 * content sat at opacity 0 forever.
 */
/**
 * Hydration probe. The store never changes, so `subscribe` is a no-op; React
 * simply serves getServerSnapshot() during SSR and hydration, then switches to
 * getSnapshot() once the tree is interactive.
 */
const subscribeToNothing = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    getHydratedSnapshot,
    getServerSnapshot
  );

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <m.div
          key={pathname}
          initial={hydrated ? { opacity: 0, y: 8 } : false}
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
