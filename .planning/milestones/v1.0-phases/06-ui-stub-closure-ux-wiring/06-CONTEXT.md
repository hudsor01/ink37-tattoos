# Phase 6: UI Stub Closure + UX Wiring - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning
**Source:** Gap closure from v1.0-MILESTONE-AUDIT.md

<domain>
## Phase Boundary

Close remaining integration gaps from v1.0 milestone audit. Two of the four original gaps (PUB-01 gallery preview, ADMIN-01 revenue chart) were already fixed in the codebase after the Phase 2 verification. Two gaps remain: admin sign-out uses a GET link instead of Better Auth's signOut() POST action, and the payment success page lacks a link to the client portal.

</domain>

<decisions>
## Implementation Decisions

### Admin Sign-Out Fix (INT-03)
- **D-01:** Convert admin sign-out from `<Link href="/api/auth/sign-out" />` (GET navigation) to a client-side button that calls `signOut()` from `@/lib/auth-client` (POST action)
- **D-02:** Match the portal header pattern exactly: `import { signOut } from '@/lib/auth-client'`, call `await signOut()`, then `window.location.href = '/login'`
- **D-03:** The admin-nav.tsx component currently uses Radix `<Link>` for the sign-out item. Replace with an `onClick` handler on the button/item that triggers `signOut()`. The component will need `'use client'` if not already present, or the sign-out button can be extracted to a separate client component.

### Payment Success Portal Link (FLOW-01)
- **D-04:** Add a secondary link to `/portal/payments` on the payment success page so clients can view their receipt and payment history
- **D-05:** The portal link should only appear contextually — either always shown (since it's a tattoo payment page, the user likely has a portal account) or conditionally if a session cookie exists. Simplest: always show the link with text like "View your payment history" since unauthenticated users will be redirected to login by middleware.

### Already Resolved (No Action Needed)
- **D-06:** PUB-01 (home page gallery preview) — ALREADY FIXED. `getPublicDesigns` imported and called on line 48 of `src/app/(public)/page.tsx`. Real designs rendered via `next/image` with proper sizing. Skeleton fallback only shows when no designs exist.
- **D-07:** ADMIN-01 (dashboard revenue chart) — ALREADY FIXED. `RevenueChart` imported and rendered on the dashboard when `revenueData.length > 0`. The "Charts will appear once you have session data" is a proper empty-state message, not a stub.

### Claude's Discretion
- Exact styling of the portal link on the payment success page (should fit existing page style)
- Whether to extract sign-out to a separate client component or make admin-nav a client component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sign-out pattern (reference implementation)
- `src/components/portal/portal-header.tsx` — Correct sign-out pattern: `import { signOut } from '@/lib/auth-client'`, `await signOut()`, `window.location.href = '/login'`

### Files to modify
- `src/components/dashboard/admin-nav.tsx` — Admin sidebar with broken GET sign-out link on line 106
- `src/app/(public)/payment/success/page.tsx` — Payment success page, currently only has "Return to Home" button

### Audit report
- `.planning/v1.0-MILESTONE-AUDIT.md` — Full gap descriptions under INT-03 and FLOW-01

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@/lib/auth-client` exports `signOut` function — used in portal-header.tsx, should be reused
- `@/components/ui/button` Button component with `render` prop for Link wrapping

### Established Patterns
- Portal header uses `'use client'` directive, `useSession()` for user state, `signOut()` on click
- Admin nav currently uses `SidebarMenuButton` with `render={<Link>}` for navigation items
- Payment pages use `lucide-react` icons and centered layout with `flex-col items-center`

### Integration Points
- Admin nav sign-out item at line 104-110 of admin-nav.tsx
- Payment success page is a server component — portal link can be a static Link

</code_context>

<specifics>
## Specific Ideas

No specific requirements — the audit defines exactly what needs to change.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-ui-stub-closure-ux-wiring*
*Context gathered: 2026-03-22*
