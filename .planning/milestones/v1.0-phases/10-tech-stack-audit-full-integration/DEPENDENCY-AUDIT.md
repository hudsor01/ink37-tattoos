# Dependency Audit Report - Phase 10

**Date:** 2026-03-26
**Scope:** All 32 runtime dependencies in package.json
**Method:** Source code grep + file analysis across src/

---

## Audit Report

| # | Dependency | Version | Used APIs | Available Unused APIs | Status |
|---|-----------|---------|-----------|----------------------|--------|
| 1 | `@base-ui/react` | 1.3.0 | Menu, Dialog, Select, Switch, Tabs, Accordion, Tooltip, Sheet, AlertDialog (via Shadcn UI wrappers in 15 files) | Checkbox, Slider, Progress, Popover, NumberField, Collapsible | KEEP |
| 2 | `@calcom/embed-react` | 1.5.3 | `Cal`, `getCalApi` in cal-embed.tsx | Inline embed mode, prefill options | KEEP |
| 3 | `@hookform/resolvers` | 5.2.2 | `zodResolver` in 5 form components | yupResolver, valibotResolver, ajvResolver | KEEP |
| 4 | `@neondatabase/serverless` | 1.0.2 | Neon WebSocket driver via drizzle-orm neon-serverless adapter in db/index.ts | Transaction support, Pool, neonConfig | KEEP |
| 5 | `@radix-ui/react-slot` | 1.2.4 | `Slot` component in FormControl (src/components/ui/form.tsx) for composing form controls with arbitrary child elements | N/A (single-purpose) | **KEEP** |
| 6 | `@tanstack/react-query` | 5.91.3 | `QueryClient`, `QueryClientProvider`, `useQuery`, `useQueryClient`, `invalidateQueries` in 7 files | `useMutation`, `useInfiniteQuery`, `useQueries`, `useSuspenseQuery`, `prefetchQuery` | ENHANCE |
| 7 | `@tanstack/react-table` | 8.21.3 | `ColumnDef`, `SortingState`, `ColumnFiltersState`, `flexRender`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `useReactTable` in data-table.tsx + 2 consumer files | `VisibilityState`, `RowSelectionState`, `getGroupedRowModel`, `getExpandedRowModel`, `getFacetedRowModel`, column pinning, global filtering | ENHANCE |
| 8 | `@vercel/blob` | 2.3.1 | `put` in upload route handler | `list`, `del`, `head`, `copy` | KEEP |
| 9 | `better-auth` | 1.5.5 | `betterAuth`, `nextCookies`, `admin` plugin, `createAuthClient`, `adminClient`, `toNextJsHandler` across auth.ts, auth-client.ts, API route | Rate limiting plugin, session management APIs, two-factor auth, organization plugin, magic link | EVALUATE |
| 10 | `class-variance-authority` | 0.7.1 | `cva`, `type VariantProps` in button.tsx, badge.tsx, and other UI components | Compound variants (partially used) | KEEP |
| 11 | `clsx` | 2.1.1 | Used in `cn()` utility (src/lib/utils.ts) and UI components | N/A (fully utilized) | KEEP |
| 12 | `date-fns` | 4.1.0 | `format()` in 12 files (portal pages, dashboard pages, columns, order detail) | `formatDistance`, `formatRelative`, `differenceInDays`, `isAfter`, `isBefore`, `parseISO`, `addDays`, `startOfMonth`, `endOfMonth`, `eachDayOfInterval` | ENHANCE |
| 13 | `drizzle-orm` | 0.45.1 | Full ORM usage: schema definition, relational queries (`db.query`), SQL builder (`eq`, `desc`, `and`, `or`, `sql`, `count`, `sum`, `avg`), relations, type inference in 23 files | `inArray`, `notInArray`, `between`, `like`, `ilike`, prepared statements, batch transactions | KEEP |
| 14 | `framer-motion` | 12.38.0 | `motion.div` with fade-in/slide-up animation in hero-section.tsx (1 file only) | `AnimatePresence`, `motion.ul`/`motion.li`, `staggerChildren`, `layoutId`, `useScroll`, `useMotionValue`, `useTransform`, `useInView`, `Reorder` | ENHANCE |
| 15 | `lucide-react` | 0.462.0 | Extensive icon usage across 52 files (navigation, buttons, status indicators, KPI cards) | 1500+ additional icons available | KEEP |
| 16 | `next` | 16.2.0 | App Router, Server Components, Server Actions, Route Handlers, Image, Link, metadata, middleware, ISR | `after()`, `useOptimistic`, `cacheLife`/`cacheTag`, Partial Prerendering, `forbidden()`/`unauthorized()` | ENHANCE |
| 17 | `next-themes` | 0.4.6 | `ThemeProvider` in providers.tsx | `useTheme` hook (available but theme toggle not yet exposed to users) | KEEP |
| 18 | `pg` | 8.13.1 | `Pool` for Better Auth database connection in auth.ts | Client, native bindings, cursor, copy | KEEP |
| 19 | `react` | 19.2.3 | Core framework: hooks (useState, useEffect, useCallback, useMemo, useRef, useId, useContext, useActionState), createContext, forwardRef, Suspense | `useOptimistic`, `use`, `useTransition` (partially used), React Server Components (used), `startTransition` | KEEP |
| 20 | `react-day-picker` | 9.14.0 | Dependency for Shadcn Calendar/DatePicker component (calendar component not yet scaffolded but react-day-picker is the underlying lib) | Date range picker, multi-select, custom modifiers | KEEP |
| 21 | `react-dom` | 19.2.3 | Core framework: rendering, portals | `useFormStatus`, `preload`, `preinit` | KEEP |
| 22 | `react-hook-form` | 7.71.2 | `useForm`, `FormProvider`, `Controller`, `useFormContext` in 6 form files | `useFieldArray`, `useWatch`, `useFormState`, `setFocus`, `trigger` (manual validation) | KEEP |
| 23 | `recharts` | 2.15.4 | `ResponsiveContainer`, `AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend` in analytics-chart.tsx + chart.tsx | `BarChart`, `PieChart`, `LineChart`, `RadarChart`, `ComposedChart`, `Treemap` | KEEP |
| 24 | `resend` | 6.9.4 | `Resend` class for sending emails in resend.ts | Batch send, audience management, domains, contacts API | KEEP |
| 25 | `server-only` | 0.0.1 | Imported in 17 server-side files (auth, stripe, env, db, all DAL modules, email) as build-time boundary enforcement | N/A (single-purpose) | KEEP |
| 26 | `shadcn` | 4.1.0 | CLI tool + Tailwind CSS integration via `@import "shadcn/tailwind.css"` in globals.css; generates UI components in src/components/ui/ | Additional component generation (chart, calendar, date-picker, etc.) | KEEP |
| 27 | `sonner` | 2.0.7 | `Toaster` component in providers.tsx; `toast.success`, `toast.error` in 17 files for mutation feedback | `toast.promise()`, `toast.loading()`, `toast.dismiss()`, `toast.custom()`, action buttons, undo | ENHANCE |
| 28 | `stripe` | 20.4.1 | `Stripe` class, Checkout Sessions, webhook verification, event handling, Products/Prices in stripe.ts, store-actions.ts, webhook route | Customer portal, subscriptions, invoices, payment intents (direct), connect, billing meter | KEEP |
| 29 | `tailwind-merge` | 3.4.0 | `twMerge` in `cn()` utility (src/lib/utils.ts) for className conflict resolution | N/A (fully utilized) | KEEP |
| 30 | `tw-animate-css` | 1.4.0 | `@import "tw-animate-css"` in globals.css for Shadcn animation classes | All animation utilities available via Tailwind classes | KEEP |
| 31 | `ws` | 8.20.0 | WebSocket implementation passed to Drizzle ORM Neon driver in src/lib/db/index.ts (`ws: ws`) | Server creation, client connections (not needed -- used only as transport for Neon) | **KEEP** |
| 32 | `zod` | 4.3.6 | Schema validation throughout: env.ts, validation.ts, form resolvers, test files in 5 files | `z.pipe`, `z.transform`, `z.preprocess`, `z.discriminatedUnion`, `z.intersection`, `z.lazy` | KEEP |
| 33 | `zustand` | 5.0.12 | `create` with `persist` middleware in cart-store.ts for client-side shopping cart state | `devtools`, `immer`, `subscribeWithSelector`, `combine`, `shallow` comparisons | KEEP |

**Total:** 33 entries (32 from original package.json + nuqs just added)

---

## Status Legend

| Status | Meaning |
|--------|---------|
| KEEP | Dependency is correctly used; no changes needed |
| ENHANCE | Dependency has valuable unused APIs that should be activated |
| EVALUATE | Requires deeper analysis before deciding on expansion |
| NEW | Just added to the project |

---

## Key Findings

### Confirmed NOT Dead

**ws (8.20.0) -- KEEP**
- Location: `src/lib/db/index.ts`
- Usage: Passed as WebSocket transport to the Drizzle ORM Neon serverless driver (`ws: ws` in the drizzle config)
- Justification: The `@neondatabase/serverless` driver requires a WebSocket implementation for server-side Node.js environments. Without `ws`, database connections would fail in all non-browser runtimes.

**@radix-ui/react-slot (1.2.4) -- KEEP**
- Location: `src/components/ui/form.tsx`
- Usage: `Slot` component used by `FormControl` to compose arbitrary child elements while forwarding props, refs, and event handlers
- Justification: This is a core part of the Shadcn form system. The `Slot` component allows `FormControl` to wrap any input element (Input, Select, Textarea) and inject `id`, `aria-describedby`, and `aria-invalid` attributes without requiring a specific component type. Removing it would break all form controls.

### Enhancement Candidates (for Plan 02/03)

1. **@tanstack/react-query**: Add `useMutation` for optimistic updates on dashboard mutations (currently calling Server Actions directly with manual toast feedback)
2. **@tanstack/react-table**: Add `VisibilityState` column toggle and `RowSelectionState` for batch operations (implemented in this plan, Task 2)
3. **framer-motion**: Currently only `motion.div` in hero. Could add `AnimatePresence` for page transitions, `staggerChildren` for list animations on gallery/product grids
4. **date-fns**: Only `format()` used in 12 files. `formatDistance` ("3 days ago") and `formatRelative` ("next Tuesday") would improve UX in dashboard lists and portal
5. **sonner**: `toast.promise()` pattern would replace manual try/catch + toast.success/error in all 17 mutation callsites
6. **next**: `after()` for non-blocking audit logging, `useOptimistic` for instant UI feedback on status changes

---

## better-auth Plugin Evaluation

### Current Auth Setup
- **Server:** `betterAuth()` with `nextCookies()` and `admin()` plugin in src/lib/auth.ts
- **Client:** `createAuthClient()` with `adminClient()` plugin in src/lib/auth-client.ts
- **Database:** Raw `pg.Pool` connection (decoupled from Drizzle per architecture decision)
- **RBAC:** 5-tier role system (SUPER_ADMIN, ADMIN, MANAGER, STAFF, USER) via admin plugin

### Rate Limiting Plugin

**Current implementation:** Custom in-memory rate limiter at `src/lib/security/rate-limiter.ts`
- Uses `globalThis` Map for persistence across module reloads
- Supports configurable `maxRequests` and `windowMs` per identifier
- Applied to contact form submissions and auth endpoints
- Periodic cleanup prevents memory leaks (60s interval)
- Tested in `src/__tests__/rate-limiter.test.ts`

**better-auth rate limiting plugin:**
- Only covers authentication endpoints (login, register, password reset)
- Does not cover non-auth routes (contact form, booking, API endpoints)
- Would be redundant for auth routes since custom limiter already covers them

**Recommendation: KEEP custom rate limiter.** The custom implementation covers all public endpoints (contact, booking, auth), not just auth routes. The better-auth rate limiting plugin has narrower scope. No benefit to switching.

### Session Management

**Current state:** better-auth already provides session listing APIs out of the box. The admin plugin exposes `listSessions` and `revokeSession` on both server and client.

**Potential use:** Portal "Active Sessions" feature where clients can see their logged-in devices and revoke sessions remotely.

**Recommendation: DEFER to v2.** Not in current milestone scope. The APIs are already available when needed -- no plugin installation required, just UI implementation. Note as an enhancement candidate for the client portal.

### Two-Factor Authentication (2FA)

**Available plugin:** `twoFactor` plugin from `better-auth/plugins`
- Supports TOTP (authenticator apps), SMS, email verification
- Adds backup codes, trusted devices
- Requires additional database tables for TOTP secrets

**Context:** This is a tattoo studio platform with a small number of admin users (1-3 artists) and a client portal. The risk profile is low:
- No financial data stored directly (Stripe handles payments)
- No health records beyond basic consent forms
- Admin accounts are invitation-only

**Recommendation: DEFER to v2.** A tattoo studio admin dashboard does not yet need 2FA. If the platform scales to multiple studios or handles more sensitive data, 2FA should be reconsidered. Note it as an enhancement candidate.

---

## Summary

| Category | Count |
|----------|-------|
| KEEP | 26 |
| ENHANCE | 6 |
| EVALUATE | 1 (better-auth -- resolved above) |
| NEW | 1 (nuqs) |
| **Total** | **33** |

All 32 original dependencies are justified. No dependencies should be removed. Six dependencies have significant untapped APIs that Plans 02 and 03 will activate.
