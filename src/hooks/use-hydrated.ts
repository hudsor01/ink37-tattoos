import * as React from 'react';

/**
 * Returns false during SSR and hydration, true once the tree is interactive.
 *
 * WHY THIS EXISTS
 * framer-motion writes whichever variant it resolves as "initial" into the
 * server-rendered markup. A plain `initial={{ opacity: 0 }}` therefore ships
 * `style="opacity:0"` from the server, and the element is only ever made
 * visible by hydration running `animate`. Any failure to execute client JS
 * leaves a fully-formed DOM with invisible content -- which is exactly how a
 * CSP `'strict-dynamic'` directive blanked this entire site (see the comment
 * block in src/proxy.ts).
 *
 * Gating `initial` on this hook makes framer resolve the FIRST mount to the
 * `animate` variant, so the server ships the settled, visible state. Once
 * hydration completes the store flips and every subsequent mount -- a route
 * change, a carousel slide, a re-keyed list after a filter change -- animates
 * normally:
 *
 *   initial={hydrated ? { opacity: 0, y: 8 } : false}
 *
 * WHY useSyncExternalStore AND NOT useState + useEffect
 * A `useEffect(() => setHydrated(true), [])` pair trips
 * react-hooks/set-state-in-effect and causes the cascading render that rule
 * warns about. useSyncExternalStore is the sanctioned API: React serves
 * getServerSnapshot() during SSR and hydration, then switches to
 * getSnapshot(), so the server and first client render agree and there is no
 * hydration mismatch.
 *
 * The store is module scope, not per-hook, so every consumer shares one
 * subscription rather than each forcing its own post-hydration update.
 *
 * DO NOT apply this to `whileInView` elements. Those resolve
 * `variantToSet = animate`, which is undefined for them, so they would render
 * with no opacity at all and their scroll-in animations would stop firing
 * entirely. Their hidden initial state is the point. Only elements that
 * animate on MOUNT (`initial` + `animate`) belong here.
 */
function subscribe() {
  // The value transitions exactly once, when React swaps the server snapshot
  // for the client one. There is nothing external to listen to, so this is a
  // no-op that returns a valid unsubscribe -- React calls the return value on
  // unmount, and returning undefined would throw "destroy is not a function".
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function useHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
