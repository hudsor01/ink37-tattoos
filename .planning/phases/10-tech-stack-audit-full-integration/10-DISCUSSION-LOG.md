# Phase 10: Tech Stack Audit & Full Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 10-tech-stack-audit-full-integration
**Areas discussed:** Dependency audit corrections, TanStack Query expansion, framer-motion expansion, date-fns expansion, sonner enhancement, nuqs integration, Next.js 16 features, react-table enhancements, better-auth plugins
**Mode:** --auto (all decisions auto-selected)

---

## Dependency Audit Corrections

| Option | Description | Selected |
|--------|-------------|----------|
| Focus on high-impact items | Audit all 32 but implement only 8 high-impact changes | ✓ |
| Full implementation pass | Implement changes for all 32 deps | |

**User's choice:** [auto] Focus on high-impact items + correct ws/react-slot assumptions
**Notes:** Codebase scout revealed ws and @radix-ui/react-slot are actively used. TanStack Query and sonner already have significant usage. Scope narrowed to enhancement, not greenfield activation.

---

## TanStack Query Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard mutations with optimistic updates | Add useMutation wrapping Server Actions | ✓ |
| Full client-side data layer | Replace all server-side fetching with client queries | |

**User's choice:** [auto] Dashboard mutations with optimistic updates (recommended default)
**Notes:** useQuery already used in 6+ files. Focus is useMutation for mutations that currently call actions directly.

---

## framer-motion Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative -- route transitions + list stagger | AnimatePresence on layouts, stagger on grids | ✓ |
| Aggressive -- animate everything | Every interaction, microinteractions, hover states | |

**User's choice:** [auto] Conservative approach (recommended default)
**Notes:** Only hero-section.tsx currently uses framer-motion. Keep animations purposeful and subtle.

---

## date-fns Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Relative timestamps in lists, absolute in details | formatDistance in lists, keep format() in detail views | ✓ |
| All relative everywhere | Replace all date displays | |

**User's choice:** [auto] Relative in lists, absolute in details (recommended default)
**Notes:** format() used in 10+ files. formatDistance/formatRelative not used anywhere yet.

---

## sonner Enhancement

| Option | Description | Selected |
|--------|-------------|----------|
| toast.promise() wrapping Server Actions | Replace manual success/error with promise pattern | ✓ |
| Keep current pattern | Leave as toast.success/toast.error | |

**User's choice:** [auto] toast.promise() pattern (recommended default)
**Notes:** 10+ files use toast.success/toast.error after try/catch. Systematic upgrade.

---

## nuqs Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Gallery + admin filters | Replace useSearchParams in gallery, add URL state to admin tables | ✓ |
| Gallery only | Only replace existing useSearchParams | |

**User's choice:** [auto] Gallery + admin filters (recommended default)
**Notes:** useSearchParams in gallery-filter-bar.tsx and gallery-grid.tsx.

---

## Next.js 16 Features

| Option | Description | Selected |
|--------|-------------|----------|
| after() + useOptimistic | Post-response audit logging + optimistic status updates | ✓ |
| Full PPR + caching overhaul | Also enable Partial Prerendering and granular caching | |

**User's choice:** [auto] after() + useOptimistic (recommended default)
**Notes:** No current usage of after() or useOptimistic. Conservative adoption.

---

## react-table Enhancements

| Option | Description | Selected |
|--------|-------------|----------|
| Column visibility toggle | Add dropdown to shared DataTable | ✓ |
| Column visibility + row selection + global filter | Full enhancement pass | |

**User's choice:** [auto] Column visibility toggle (recommended default)
**Notes:** DataTable used across 5+ admin pages. Row selection only where batch ops make sense.

---

## better-auth Plugins

| Option | Description | Selected |
|--------|-------------|----------|
| Evaluate rate limiting + session APIs | Research plugin ecosystem, adopt if clear benefit | ✓ |
| Implement 2FA | Full two-factor auth implementation | |

**User's choice:** [auto] Evaluate rate limiting + session APIs (recommended default)
**Notes:** Current custom rate limiter may be sufficient. Evaluation only.

---

## Claude's Discretion

- Animation timing and easing values
- Which DataTable columns default to hidden
- Granular caching strategy details
- Rate limiter replacement decision

## Deferred Ideas

None -- discussion stayed within phase scope
