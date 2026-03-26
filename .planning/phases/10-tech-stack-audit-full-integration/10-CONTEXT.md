# Phase 10: Tech Stack Audit & Full Integration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit all 32 runtime dependencies to document used vs available APIs, correct false assumptions about dead dependencies, remove genuinely unused ones, and systematically activate underutilized features. The goal is extracting maximum value from what's already in the bundle -- not adding new dependencies (except nuqs for URL state management).

</domain>

<decisions>
## Implementation Decisions

### Dependency Audit Corrections
- **D-01:** ws is NOT dead -- it's required by the Neon serverless Drizzle driver for WebSocket connections (src/lib/db/index.ts). Keep it.
- **D-02:** @radix-ui/react-slot is NOT dead -- it's used by Shadcn's FormControl component (src/components/ui/form.tsx). Keep it.
- **D-03:** TanStack Query IS already used -- useQuery, useQueryClient, invalidateQueries in 6+ dashboard files. Expansion target is useMutation for optimistic updates.
- **D-04:** sonner IS already used -- toast.success/toast.error across 10+ files. Enhancement target is toast.promise() pattern.
- **D-05:** date-fns IS used but only format(). Expansion target is formatDistance/formatRelative for relative timestamps.
- **D-06:** Audit all 32 runtime deps but focus implementation effort on the 8 high-impact items identified below.

### TanStack Query Expansion (STACK-04)
- **D-07:** Add useMutation hooks wrapping Server Actions for dashboard mutations that currently call actions directly
- **D-08:** Use optimistic updates via useMutation onMutate/onSettled for status changes (appointment status, order status)
- **D-09:** Leverage existing invalidateQueries pattern already established in customer-list-client.tsx

### framer-motion Expansion (STACK-05)
- **D-10:** Conservative approach -- don't over-animate. Add AnimatePresence + motion.div on route group layouts for page transitions
- **D-11:** Add staggerChildren list animations on gallery grid, product grid, and appointment list
- **D-12:** Use layoutId for shared element transitions only where it naturally fits (e.g., gallery lightbox)

### date-fns Expansion (STACK-06)
- **D-13:** Replace absolute date displays with formatDistance (e.g., "3 days ago") in dashboard lists and portal pages
- **D-14:** Use formatRelative for appointment proximity (e.g., "next Tuesday at 2pm")
- **D-15:** Keep absolute dates in admin detail views and tables where precision matters

### sonner Enhancement (STACK-08)
- **D-16:** Wrap all Server Action mutation calls in toast.promise() pattern (loading/success/error states)
- **D-17:** Replace manual toast.success/toast.error after try/catch with toast.promise() on the action call itself
- **D-18:** Add action toasts with undo capability only where reversible (e.g., soft-delete operations)

### nuqs Integration (STACK-03)
- **D-19:** Install nuqs and add NuqsAdapter to providers.tsx
- **D-20:** Rewrite gallery-filter-bar.tsx and gallery-grid.tsx to use useQueryStates instead of manual useSearchParams
- **D-21:** Add nuqs-based filters to admin DataTable views (customers, appointments, orders) where filter state should persist in URL

### Next.js 16 Features (STACK-07)
- **D-22:** Use after() for audit logging -- move logAudit() calls from inline .catch() to after(() => logAudit()) in Server Actions
- **D-23:** Add useOptimistic for appointment status toggles and order status updates in dashboard
- **D-24:** Evaluate cacheLife/cacheTag for DAL cache functions -- only adopt if clear benefit over current staleTime approach

### react-table Enhancements (STACK-09)
- **D-25:** Add column visibility toggle dropdown to the shared DataTable component
- **D-26:** Row selection only where batch operations exist or are clearly useful (orders for batch fulfillment)
- **D-27:** Global filtering already handled by individual table implementations -- don't add redundant global filter

### better-auth Plugin Audit (STACK-10)
- **D-28:** Evaluate rate limiting plugin as replacement/supplement to current custom rate limiter
- **D-29:** Evaluate session management APIs for active session listing in portal
- **D-30:** Two-factor auth evaluation only -- don't implement unless clear value for a tattoo studio platform

### Claude's Discretion
- Exact animation timing, easing, and duration values for framer-motion transitions
- Which specific DataTable columns default to hidden vs visible
- Granular caching strategy details (cacheLife profiles, cache tag naming)
- Whether to keep custom rate limiter or replace with better-auth plugin (depends on feature parity)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs -- requirements are fully captured in decisions above and in ROADMAP.md/REQUIREMENTS.md.

### Project configuration
- `.planning/ROADMAP.md` -- Phase 10 goal, success criteria, requirement mapping
- `.planning/REQUIREMENTS.md` -- STACK-01 through STACK-10 requirement definitions
- `CLAUDE.md` -- Tech stack decisions, critical pitfalls, architecture decisions

### Existing code (key integration points)
- `src/components/providers.tsx` -- QueryClient + Toaster setup, will add NuqsAdapter
- `src/components/dashboard/data-table.tsx` -- Shared DataTable component to enhance
- `src/lib/db/index.ts` -- Neon/Drizzle connection (ws dependency confirmed needed)
- `src/components/ui/form.tsx` -- @radix-ui/react-slot usage (confirmed needed)
- `src/components/public/gallery-filter-bar.tsx` -- useSearchParams to replace with nuqs
- `src/components/public/gallery-grid.tsx` -- useSearchParams to replace with nuqs
- `src/components/public/hero-section.tsx` -- Only framer-motion usage currently
- `package.json` -- All 32 runtime dependencies with versions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QueryClient` provider already in providers.tsx with 60s staleTime -- extend, don't replace
- `DataTable` component with react-table in data-table.tsx -- enhance with column visibility
- `toast.success`/`toast.error` pattern in 10+ files -- systematic upgrade to toast.promise()
- `useQuery` + `useQueryClient` + `invalidateQueries` pattern in customer-list-client.tsx -- replicate for mutations
- `format()` from date-fns in 10+ files -- augment with formatDistance/formatRelative

### Established Patterns
- Server Actions for mutations, called directly from client components
- useQuery for data fetching with queryKey-based cache invalidation
- Sonner toast for success/error feedback after mutations
- ISR with server-side data fetch for public pages
- Client-side filtering with URL searchParams for gallery

### Integration Points
- providers.tsx -- NuqsAdapter wraps around existing providers
- Route group layouts -- AnimatePresence wrappers for page transitions
- Server Action files -- after() for audit logging, toast.promise() on client side
- DataTable component -- column visibility toggle, row selection APIs

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches for each integration. The codebase scout revealed that several dependencies thought to be unused are actually in use (ws, react-slot, TanStack Query, sonner), which narrows the scope to enhancement of existing usage rather than greenfield activation.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 10-tech-stack-audit-full-integration*
*Context gathered: 2026-03-25*
