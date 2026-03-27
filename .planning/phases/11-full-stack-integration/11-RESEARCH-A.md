# Phase 11: Full Stack Integration - Research (Part A)

**Researched:** 2026-03-26
**Domain:** shadcn/ui + Base UI, Next.js 16, React 19.2, TanStack Form
**Confidence:** HIGH

## Summary

This research covers four major integration domains for the ink37-tattoos project. The codebase is already partially modernized -- it uses `@base-ui/react` 1.3.0 with the `base-nova` shadcn style, has `proxy.ts` instead of deprecated middleware, and uses some React 19 features (useOptimistic, useActionState, useTransition). However, significant gaps remain: no `use cache` / PPR (Partial Prerendering) despite Next.js 16.2 supporting it, no Suspense boundaries for streaming, 7 routes still using `export const dynamic = 'force-dynamic'`, most pages lacking `generateMetadata`, zero use of React 19 resource preloading APIs, Context still using `.Provider` pattern in UI components, and react-hook-form is the current form library with 5 forms in production.

The project has 23 shadcn/ui components installed but is missing at least 15 high-value components for a tattoo studio platform (Calendar, Date Picker, Drawer, Command, Popover, Checkbox, Progress, Avatar, Scroll Area, Collapsible, Hover Card, Radio Group, Slider, Toggle, Input OTP). TanStack Form v1.28.5 is production-ready and offers superior TypeScript safety, but migration from react-hook-form is not trivial and should be weighed against the 5-form scope of this project.

**Primary recommendation:** Enable `cacheComponents` in next.config.ts, add Suspense boundaries to all data-fetching pages, install missing shadcn components (prioritize Calendar, Date Picker, Drawer, Command, Popover, Checkbox, Progress, Avatar), adopt `generateMetadata` on all public pages, and add React 19 resource preloading. Keep react-hook-form unless a full rewrite is planned.

## Project Constraints (from CLAUDE.md)

### Framework & Stack
- **Framework:** Next.js 16 + React 19.2
- **Package Manager:** bun (never npm/yarn/pnpm)
- **UI:** Shadcn/Radix + Tailwind CSS 4 (currently using Base UI `base-nova` style)
- **ORM:** Drizzle ORM 0.45.1
- **Auth:** Better Auth v1.5.5 with 5-tier RBAC
- **State:** TanStack Query (server) + Zustand (client)
- **Supabase Auth:** Use `getAll`/`setAll` cookie methods only (global instruction)

### Architecture
- Single app with route groups: (public), (auth), (dashboard), (portal), (store)
- Data Access Layer (DAL) pattern
- Server Actions for mutations, Route Handlers for webhooks only
- Import db from @/lib/db, schema from @/lib/db/schema

---

## 1. shadcn/ui + Base UI Investigation

### Current State

**Style:** `base-nova` (compact layout, Base UI primitives)
**shadcn CLI version:** 4.1.0 (latest)
**Base UI version:** 1.3.0 (latest)
**Radix dependency:** Only `@radix-ui/react-slot@1.2.4` remains (used in `form.tsx`)

The project has already migrated from Radix to Base UI. 15 of 23 installed UI components import from `@base-ui/react`. Only `form.tsx` still imports `@radix-ui/react-slot`.

**Confidence:** HIGH -- verified from package.json, components.json, and grep of imports.

### Base UI Migration Status

| Status | Detail |
|--------|--------|
| Migration complete | 15/23 components use `@base-ui/react` |
| Remaining Radix | `form.tsx` uses `@radix-ui/react-slot` (react-hook-form integration) |
| API difference | Base UI uses `render` prop, not Radix `asChild` |
| Style config | `components.json` set to `"style": "base-nova"` |

The shadcn/ui ecosystem split into Radix and Base UI styles in January 2026. Base UI reached v1.0 stable in December 2025. The `base-nova` style provides compact layouts suited to dashboard-heavy apps like this one.

**Source:** [shadcn/ui Changelog - Base UI (Jan 2026)](https://ui.shadcn.com/docs/changelog/2026-01-base-ui)

### Installed vs Available Components

**Currently installed (23):**
accordion, alert-dialog, badge, breadcrumb, button, card, chart, dialog, dropdown-menu, form, input, label, pagination, select, separator, sheet, sidebar, skeleton, switch, table, tabs, textarea, tooltip

**Missing components with HIGH value for tattoo studio platform:**

| Component | Value For This Project | Priority |
|-----------|----------------------|----------|
| **Calendar** | Appointment scheduling views, session date picking | HIGH |
| **Date Picker** | All date inputs in forms (DOB, appointment dates) -- currently using raw `<input type="date">` | HIGH |
| **Drawer** | Mobile-friendly panels (currently using Sheet, Drawer is purpose-built) | HIGH |
| **Command** | Admin command palette (Cmd+K) for quick navigation | HIGH |
| **Popover** | Required by Date Picker, also useful for inline editing | HIGH |
| **Checkbox** | Form checkboxes (consent forms, filter checklists, medical conditions) | HIGH |
| **Progress** | Upload progress bars, session completion tracking | MEDIUM |
| **Avatar** | Customer/artist profile images, admin nav | MEDIUM |
| **Scroll Area** | Long lists in sidebar, gallery scroll containers | MEDIUM |
| **Collapsible** | FAQ sections, expandable form sections | MEDIUM |
| **Radio Group** | Form selections (appointment type, payment method) | MEDIUM |
| **Slider** | Price range filters in store, tip amount selection | MEDIUM |
| **Toggle / Toggle Group** | View mode switches (grid/list), filter toggles | MEDIUM |
| **Input OTP** | Two-factor auth codes, verification | MEDIUM |
| **Hover Card** | Customer preview on hover in appointment lists | LOW |

**Missing components with LOW value (skip for now):**
Aspect Ratio, Carousel (framer-motion handles this), Context Menu, Menubar, Navigation Menu, Resizable, Sonner (already using Sonner directly), Toast (using Sonner).

### New shadcn/ui v4 Features Not Yet Used

| Feature | Detail | Action |
|---------|--------|--------|
| Presets | One-string design config for colors, theme, fonts, radius | Can lock down design system |
| `shadcn docs` CLI | Quick component docs from terminal | Developer convenience |
| Dry-run & Diff | Preview component additions before install | Safety for CI |
| RTL support | CLI transforms classes for RTL layouts | Not needed (English-only site) |
| New base colors | mauve, olive, mist, taupe | Evaluate for brand alignment |

**Source:** [shadcn CLI v4 (March 2026)](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)

### Component Installation Commands

```bash
# HIGH priority (install first)
bun x shadcn@latest add calendar date-picker drawer command popover checkbox

# MEDIUM priority
bun x shadcn@latest add progress avatar scroll-area collapsible radio-group slider toggle toggle-group input-otp

# LOW priority (as needed)
bun x shadcn@latest add hover-card
```

---

## 2. Next.js 16 Complete Feature Integration

### Current State

**Version:** Next.js 16.2.0 (latest stable)
**Turbopack:** Enabled (`next dev --turbopack`)
**proxy.ts:** Already migrated from middleware.ts (both root and src/ versions exist -- needs cleanup)

**Confidence:** HIGH -- verified from package.json, next.config.ts, and file system.

### Features NOT Currently Used

#### A. Cache Components / Partial Prerendering (PPR) -- CRITICAL GAP

**Current state:** `cacheComponents` NOT enabled in next.config.ts. Seven routes export `dynamic = 'force-dynamic'`. No `'use cache'` directives anywhere.

**What it does:** PPR pre-renders static shells at build time and streams dynamic content at request time. With `cacheComponents: true`, all pages are dynamic by default; you opt into caching with `'use cache'` directives. This replaces the old `dynamic` export.

**Impact:** Enabling PPR would significantly improve Time to First Byte (TTFB) for public pages (home, gallery, services, about, FAQ) by serving static shells instantly while streaming dynamic data.

**Migration path:**
1. Add `cacheComponents: true` to next.config.ts
2. Remove all `export const dynamic = 'force-dynamic'` (no longer compatible)
3. Add `'use cache'` to data-fetching functions that can be cached (e.g., `getPublicDesigns`)
4. Wrap dynamic components in `<Suspense>` boundaries with skeleton fallbacks
5. Use `cacheLife()` and `cacheTag()` for revalidation control

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  // ...
};
```

```typescript
// src/lib/dal/designs.ts
'use cache';
import { cacheLife, cacheTag } from 'next/cache';

export async function getPublicDesigns() {
  cacheLife('hours');
  cacheTag('designs');
  // ... existing query
}
```

**Source:** [Next.js Cache Components Docs](https://nextjs.org/docs/app/getting-started/cache-components), [Next.js 16 Blog](https://nextjs.org/blog/next-16)

#### B. Streaming with Suspense -- CRITICAL GAP

**Current state:** Zero `<Suspense>` boundaries in the entire codebase. All server component pages block-render.

**What it does:** Suspense boundaries enable progressive rendering. Static content renders immediately; dynamic sections stream in as data resolves.

**High-impact targets:**
- Dashboard page: KPI cards and charts load from DB -- wrap each in Suspense
- Gallery page: Design images from DB -- stream with skeleton grid
- Store pages: Product listings -- stream with skeleton cards
- Portal pages: User-specific data -- stream with skeletons

```tsx
// Example: Dashboard with Suspense
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<KPISkeletons />}>
        <KPISection />
      </Suspense>
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<TableSkeleton />}>
          <RecentAppointments />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueOverview />
        </Suspense>
      </div>
    </div>
  );
}
```

#### C. loading.tsx / error.tsx / not-found.tsx Per Route Group -- SIGNIFICANT GAP

**Current state:** Only 1 `not-found.tsx` at app root. Zero `loading.tsx` files. Zero `error.tsx` files.

**What's needed:**

| Route Group | loading.tsx | error.tsx | not-found.tsx |
|-------------|------------|-----------|---------------|
| (public) | Gallery skeleton, page transitions | User-friendly error | Custom 404 for public |
| (dashboard) | Dashboard skeleton with sidebar | Admin error with retry | Dashboard 404 |
| (portal) | Portal skeleton | Portal error | Portal 404 |
| (store) | Product grid skeleton | Store error with retry | "Product not found" |
| (auth) | Login form skeleton | Auth error | -- |

#### D. generateMetadata for Dynamic Routes -- MODERATE GAP

**Current state:** Only `store/[productId]/page.tsx` uses `generateMetadata`. All other pages use static `export const metadata`.

**Pages that should use generateMetadata:**
- Gallery page (could include design count, latest styles)
- Customer detail page (`/dashboard/customers/[id]`)
- Order detail page (`/dashboard/orders/[id]`)

**Pages with static metadata that are fine as-is:**
- Home, About, Contact, FAQ, Services, Booking (static content)

#### E. generateStaticParams -- MODERATE GAP

**Current state:** Not used anywhere. The store product page is a good candidate.

```typescript
// src/app/(store)/store/[productId]/page.tsx
export async function generateStaticParams() {
  const products = await getAllActiveProducts();
  return products.map((product) => ({
    productId: product.id,
  }));
}
```

**Note:** With `cacheComponents` enabled, `generateStaticParams` must return at least one param for PPR to work with dynamic segments.

#### F. Route Segment Config -- MODERATE GAP

**Current state:** Only `dynamic = 'force-dynamic'` is used (7 routes). No `revalidate`, no `fetchCache`, no `preferredRegion`.

**With `cacheComponents` enabled:** The `dynamic` export is deprecated and incompatible. Replace with `'use cache'` directives and Suspense boundaries.

**Still valid configs:**
- `export const revalidate = 3600` -- for ISR on public pages
- `export const preferredRegion = 'iad1'` -- if Vercel edge functions needed

#### G. proxy.ts Cleanup -- LOW PRIORITY BUG

**Current state:** Two proxy files exist:
- `/Users/richard/Developer/ink37-tattoos/proxy.ts` (root)
- `/Users/richard/Developer/ink37-tattoos/src/proxy.ts`

These have slightly different implementations. Next.js expects the proxy file at the project root (or `src/` if using `src` directory). Having both is ambiguous. The `src/proxy.ts` version is more complete (has `callbackUrl` parameter). Keep `src/proxy.ts`, delete root `proxy.ts`.

**Source:** [Next.js proxy.ts File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)

#### H. Image Component Features -- LOW PRIORITY

**Current state:** Using `next/image` with `fill`, `sizes`, `priority`. Already well-configured.

**Not yet used:** `placeholder="blur"` with `blurDataURL` for gallery images. Would improve perceived load time.

#### I. Font Optimization -- ALREADY DONE

**Current state:** Using `next/font/google` with Geist font. Already optimized.

#### J. Turbopack -- ALREADY DONE

**Current state:** `next dev --turbopack` in scripts. Already using stable Turbopack.

### Next.js 16.2 Specific Features Not Used

| Feature | Description | Relevance |
|---------|-------------|-----------|
| Server Fast Refresh | Fine-grained server-side hot reloading | Automatic with Turbopack |
| `experimental.prefetchInlining` | Bundles segment data into single response | Reduces prefetch requests |
| Server Function logging | Logs server action executions to terminal | Dev debugging |
| Error.cause display | Error overlay shows cause chains | Automatic |

---

## 3. React 19.2 Complete Feature Integration

### Current State

**Version:** React 19.2.3 (latest)
**Features in use:** useOptimistic (2 files), useActionState (1 file), useTransition (10 files)
**Features NOT in use:** `use()` hook, useFormStatus, useDeferredValue, resource preloading, document metadata hoisting, ref-as-prop, Context-as-provider

**Confidence:** HIGH -- verified from grep of source files.

### Features NOT Currently Used

#### A. `use()` Hook for Promises and Context -- HIGH VALUE

**Current state:** Not used. Components either `await` promises in server components or use TanStack Query in client components.

**Where it adds value:**
- Reading context conditionally (after early returns)
- Unwrapping promises in client components with Suspense

```tsx
// Example: Client component reading a promise
'use client';
import { use } from 'react';

function CustomerDetails({ customerPromise }: { customerPromise: Promise<Customer> }) {
  const customer = use(customerPromise);
  return <div>{customer.firstName} {customer.lastName}</div>;
}

// Parent passes promise, wraps in Suspense
<Suspense fallback={<Skeleton />}>
  <CustomerDetails customerPromise={getCustomer(id)} />
</Suspense>
```

#### B. useFormStatus -- HIGH VALUE

**Current state:** Not used. Forms manually track `isSubmitting` via react-hook-form's `formState.isSubmitting` or custom `isPending` state with `useTransition`.

**What it does:** Provides form submission status to child components without prop drilling. Must be called from a component rendered inside a `<form>`.

**Where it adds value:** Submit buttons across all forms (5 forms using react-hook-form, contact form using useActionState).

```tsx
// Example: Universal submit button
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : children}
    </Button>
  );
}
```

#### C. useOptimistic Expansion -- MODERATE VALUE

**Current state:** Used in 2 files (appointments, orders) for status updates.

**Additional candidates:**
- Customer list: Optimistic delete
- Session list: Optimistic status change
- Contact list: Optimistic delete/archive
- Media page: Optimistic delete

#### D. useDeferredValue -- MODERATE VALUE

**Current state:** Not used.

**React 19 improvement:** New `initialValue` parameter for faster initial renders.

**Where it adds value:**
- Gallery filter bar: Defer re-rendering of gallery grid while typing search
- Customer search in dashboard: Defer list re-rendering
- Store product filter: Defer product grid updates

```tsx
// Example: Gallery search with deferred value
const [search, setSearch] = useState('');
const deferredSearch = useDeferredValue(search, '');

return (
  <>
    <Input value={search} onChange={e => setSearch(e.target.value)} />
    <GalleryGrid designs={filterDesigns(designs, deferredSearch)} />
  </>
);
```

#### E. Resource Preloading APIs -- MODERATE VALUE

**Current state:** Not used (only Cal.com `cal('preload')` exists, which is unrelated).

**Available APIs (from `react-dom`):**
- `prefetchDNS(url)` -- Pre-resolve DNS for external domains
- `preconnect(url)` -- Pre-connect to external servers
- `preload(url, { as })` -- Pre-fetch resources
- `preinit(url, { as })` -- Pre-fetch and execute

**Where it adds value in this project:**

```tsx
// In root layout or public layout
import { prefetchDNS, preconnect } from 'react-dom';

// Pre-resolve DNS for external services
prefetchDNS('https://app.cal.com');        // Booking embed
prefetchDNS('https://api.cal.com');         // Cal.com API
prefetchDNS('https://fonts.googleapis.com'); // Google Fonts
preconnect('https://fonts.gstatic.com');    // Font files
```

#### F. Document Metadata Hoisting -- LOW VALUE (Next.js handles it)

**Current state:** Using Next.js `export const metadata` and `generateMetadata` which is the correct approach for Next.js apps.

**React 19 feature:** Components can render `<title>`, `<meta>`, `<link>` directly and React hoists them to `<head>`.

**Recommendation:** Continue using Next.js metadata API. React 19 metadata hoisting is mainly useful for non-framework React apps. Next.js `generateMetadata` provides better SSR integration and page-level metadata management.

#### G. Ref as Prop (No forwardRef) -- LOW VALUE (already clean)

**Current state:** Zero `forwardRef` calls in project code. All UI components from shadcn/ui v4 already use the modern pattern. No migration needed.

#### H. Context as Provider (No .Provider) -- MODERATE VALUE

**Current state:** 4 files use `.Provider` pattern:
- `form.tsx`: `FormFieldContext.Provider`, `FormItemContext.Provider`
- `chart.tsx`: `ChartContext.Provider`
- `sidebar.tsx`: `SidebarContext.Provider`
- `tooltip.tsx`: `TooltipPrimitive.Provider` (Base UI -- different thing)

**Migration:**
```tsx
// Before
<FormFieldContext.Provider value={{ name: props.name }}>
// After (React 19)
<FormFieldContext value={{ name: props.name }}>
```

**Note:** The `tooltip.tsx` uses `TooltipPrimitive.Provider` which is a Base UI component API, not React Context. Only `form.tsx`, `chart.tsx`, and `sidebar.tsx` should be updated.

#### I. Actions (Form Actions) -- MODERATE VALUE

**Current state:** Only `contact-form.tsx` uses native form actions via `useActionState`. All other forms use react-hook-form's `handleSubmit`.

**Where it adds value:** Simple forms that don't need client-side validation could use the `action` prop directly on `<form>`:

```tsx
<form action={serverAction}>
  <input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</form>
```

---

## 4. TanStack Form vs react-hook-form

### Current State

**react-hook-form version:** 7.71.2
**@hookform/resolvers version:** 5.2.2
**TanStack Form:** Not installed
**Forms using react-hook-form:** 5 (customer-form, appointment-form, session-form, product-form, gift-card-form)
**Forms using useActionState:** 1 (contact-form)
**shadcn form.tsx:** Tightly coupled to react-hook-form (imports Controller, FormProvider, useFormContext)

**Confidence:** HIGH -- verified from package.json and source code grep.

### Comparison

| Criteria | react-hook-form 7.71 | TanStack Form 1.28.5 |
|----------|----------------------|----------------------|
| **Bundle size** | ~12KB gzipped | ~20KB gzipped |
| **TypeScript safety** | Good (some `as any` needed) | Excellent (type-safe paths) |
| **Zod integration** | Via @hookform/resolvers | Via Standard Schema (native) |
| **Server actions** | Works with useActionState | createServerValidate built-in |
| **React 19 compat** | Full (hooks, actions) | Full (hooks, actions) |
| **Next.js App Router** | Full support | Full support |
| **Community/ecosystem** | Massive (30M+ weekly downloads) | Growing (~500K weekly downloads) |
| **shadcn integration** | Built-in form.tsx component | Need custom form component |
| **API style** | Uncontrolled (refs) | Controlled (subscriptions) |
| **forwardRef needed** | No (React 19) | No |
| **Learning curve** | Familiar to team | New patterns to learn |

### Migration Considerations

**Costs of migrating to TanStack Form:**
1. Rewrite all 5 form components
2. Replace shadcn `form.tsx` with custom TanStack Form-aware component
3. Remove `@hookform/resolvers` dependency
4. Learn new `createFormHook` / `createFormHookContexts` API
5. Risk of `@radix-ui/react-slot` being the only Radix dep left (form.tsx uses it)

**Benefits of migrating:**
1. Better TypeScript inference (no `as any` hacks like in customer-form.tsx line 58)
2. Standard Schema support (Zod works without adapter package)
3. Server validation built-in (`createServerValidate`)
4. Type-safe field paths (compile-time error on typos)
5. Removes last Radix dependency if form.tsx is rewritten

### Recommendation: Keep react-hook-form

**Rationale:**
- Only 5 forms -- migration effort does not justify benefits
- shadcn `form.tsx` is designed for react-hook-form; replacing it means custom UI code
- react-hook-form has a 60:1 community size advantage
- The `as any` in customer-form.tsx is a minor annoyance, not a bug source
- Bundle size difference is negligible for a server-rendered app
- react-hook-form 7.71 works perfectly with React 19, Zod 4, and Next.js 16

**If you DO want to migrate later:** Use TanStack Form's `createFormHook` API with Zod Standard Schema validation. Install `@tanstack/react-form` (no adapter needed for Zod 4 since it implements Standard Schema).

```bash
bun add @tanstack/react-form
# No @tanstack/zod-form-adapter needed -- Zod 4 implements Standard Schema
```

---

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| next | 16.2.0 | Framework | Current, features underused |
| react | 19.2.3 | UI library | Current, features underused |
| @base-ui/react | 1.3.0 | UI primitives | Current (latest) |
| shadcn | 4.1.0 | Component toolkit | Current (latest) |
| react-hook-form | 7.71.2 | Form management | Keep |
| @tanstack/react-query | 5.91.3 | Server state | Current |
| @tanstack/react-table | 8.21.3 | Data tables | Current |
| drizzle-orm | 0.45.1 | Database ORM | Current |

### Needs Installation
| Library | Version | Purpose | When to Install |
|---------|---------|---------|-----------------|
| shadcn components | -- | calendar, date-picker, drawer, command, popover, checkbox | Phase 11 |
| shadcn components | -- | progress, avatar, scroll-area, radio-group, slider, toggle | Phase 11 |

### Not Recommended
| Library | Why Not |
|---------|---------|
| @tanstack/react-form | Migration cost exceeds benefit for 5 forms |
| @tanstack/zod-form-adapter | Not needed (Zod 4 has Standard Schema) |
| react-helmet | React 19 + Next.js handle metadata natively |

---

## Architecture Patterns

### Pattern 1: PPR with use cache and Suspense

**What:** Enable Partial Prerendering via `cacheComponents: true`. Mark cacheable data functions with `'use cache'`. Wrap dynamic components in Suspense.

**When to use:** All pages that fetch data.

```typescript
// In data-fetching function
'use cache';
import { cacheLife, cacheTag } from 'next/cache';

export async function getPublicDesigns() {
  cacheLife('hours');
  cacheTag('designs');
  const designs = await db.query.designMedia.findMany({ ... });
  return designs;
}

// In page component
import { Suspense } from 'react';

export default function GalleryPage() {
  return (
    <div>
      <h1>Gallery</h1> {/* Static shell -- pre-rendered */}
      <Suspense fallback={<GallerySkeleton />}>
        <GalleryGrid /> {/* Streams when data ready */}
      </Suspense>
    </div>
  );
}
```

### Pattern 2: Route Group Error/Loading Boundaries

**What:** Add `loading.tsx`, `error.tsx`, and `not-found.tsx` to each route group.

```
src/app/
  (public)/
    loading.tsx      # Public page skeleton
    error.tsx        # User-friendly error
    not-found.tsx    # Custom 404
  (dashboard)/
    loading.tsx      # Dashboard skeleton with sidebar
    error.tsx        # Admin error with retry button
    not-found.tsx    # Admin 404
  (portal)/
    loading.tsx      # Portal skeleton
    error.tsx        # Portal error
  (store)/
    loading.tsx      # Product grid skeleton
    error.tsx        # Store error
  (auth)/
    loading.tsx      # Auth form skeleton
```

### Pattern 3: Resource Preloading in Layouts

**What:** Use React 19 resource preloading APIs in layout components.

```tsx
// src/app/(public)/layout.tsx
import { prefetchDNS, preconnect } from 'react-dom';

export default function PublicLayout({ children }) {
  prefetchDNS('https://app.cal.com');
  prefetchDNS('https://api.cal.com');
  preconnect('https://fonts.gstatic.com');
  return <>{children}</>;
}
```

### Anti-Patterns to Avoid

- **export const dynamic = 'force-dynamic' with cacheComponents:** Incompatible. Use `'use cache'` + Suspense instead.
- **Wrapping entire pages in single Suspense:** Place boundaries as close as possible to the data-fetching component. Multiple small Suspense boundaries are better.
- **Using React 19 metadata hoisting in Next.js:** Use Next.js `generateMetadata` / `export const metadata` instead. They provide better SSR integration.
- **Mixing Context.Provider and Context patterns:** Pick one. Migrate all to React 19 `<Context value={}>` pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picking | Custom date input with `<input type="date">` | shadcn Date Picker (Calendar + Popover) | Consistent design, accessibility, locale support |
| Command palette | Custom keyboard shortcuts + modal | shadcn Command (cmdk) | Focus management, search, keyboard nav |
| Loading states | Custom `isLoading` state per component | Next.js `loading.tsx` + Suspense | Framework-integrated, automatic |
| Error boundaries | Custom try/catch wrappers | Next.js `error.tsx` | Automatic recovery, route-level isolation |
| Form status | Custom `isPending` with useTransition | `useFormStatus` from react-dom | No prop drilling, works with any form |
| Resource hints | Manual `<link rel="preconnect">` in head | `preconnect()` / `prefetchDNS()` from react-dom | Deduplicated, SSR-compatible, framework-aware |

---

## Common Pitfalls

### Pitfall 1: cacheComponents Breaks dynamic Export
**What goes wrong:** Enabling `cacheComponents: true` and keeping `export const dynamic = 'force-dynamic'` causes build errors.
**Why it happens:** The new PPR model replaces the dynamic/static dichotomy with `'use cache'` + Suspense.
**How to avoid:** Remove ALL `dynamic` exports before enabling `cacheComponents`. There are 7 files that need this change.
**Warning signs:** Build error: "Route segment config 'dynamic' is not compatible with nextConfig.cacheComponents"

### Pitfall 2: Suspense Without Fallback Causes Flash
**What goes wrong:** Using `<Suspense>` without a meaningful fallback shows a blank space before content streams in.
**Why it happens:** Default Suspense fallback is `null`.
**How to avoid:** Always provide skeleton components as fallback. Use existing `<Skeleton>` component.

### Pitfall 3: use cache on Functions That Read Cookies/Headers
**What goes wrong:** Caching functions that depend on request-specific data (cookies, headers) returns stale data.
**Why it happens:** `'use cache'` caches the return value. Request-specific data changes per request.
**How to avoid:** Never use `'use cache'` on functions that call `cookies()`, `headers()`, or read auth state. Only cache public data.

### Pitfall 4: Duplicate proxy.ts Files
**What goes wrong:** Having both `/proxy.ts` and `/src/proxy.ts` creates ambiguous behavior.
**Why it happens:** Manual migration created duplicates.
**How to avoid:** Keep only `src/proxy.ts` (since the project uses `src/` directory). Delete root `proxy.ts`.

### Pitfall 5: useFormStatus Outside Form
**What goes wrong:** `useFormStatus` returns stale data.
**Why it happens:** Hook must be called from a component rendered INSIDE a `<form>`, not the component that renders the form.
**How to avoid:** Create a separate `SubmitButton` component and render it as a child of `<form>`.

### Pitfall 6: Context.Provider Removal Breaks Base UI Components
**What goes wrong:** Removing `.Provider` from `tooltip.tsx` `TooltipPrimitive.Provider` breaks the tooltip.
**Why it happens:** `TooltipPrimitive.Provider` is a Base UI component API, not a React Context provider. It just happens to be named "Provider."
**How to avoid:** Only update React `createContext` providers. Leave Base UI component `.Provider` references alone.

---

## Code Examples

### Cache Components Setup
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
```

### Suspense with Skeleton Fallback
```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function KPISkeletons() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<KPISkeletons />}>
        <KPISection />
      </Suspense>
    </div>
  );
}
```

### useFormStatus Submit Button
```tsx
// src/components/ui/submit-button.tsx
'use client';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function SubmitButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? 'Saving...' : children}
    </Button>
  );
}
```

### Resource Preloading in Layout
```tsx
// src/app/(public)/layout.tsx
import { prefetchDNS, preconnect } from 'react-dom';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  prefetchDNS('https://app.cal.com');
  prefetchDNS('https://api.cal.com');
  preconnect('https://fonts.gstatic.com');

  return (
    <>
      <PublicNav />
      <main>{children}</main>
      <PublicFooter />
    </>
  );
}
```

### Context Without .Provider (React 19)
```tsx
// Before
<FormFieldContext.Provider value={{ name: props.name }}>
  <Controller {...props} />
</FormFieldContext.Provider>

// After (React 19)
<FormFieldContext value={{ name: props.name }}>
  <Controller {...props} />
</FormFieldContext>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export const dynamic` | `'use cache'` + Suspense | Next.js 16 (Oct 2025) | Must remove 7 dynamic exports |
| `middleware.ts` | `proxy.ts` | Next.js 16 (Oct 2025) | Already migrated |
| Radix UI primitives | Base UI primitives | shadcn Jan 2026 | Already migrated |
| `@radix-ui/react-*` packages | `radix-ui` unified or `@base-ui/react` | Feb 2026 | Using Base UI |
| `forwardRef` | ref as prop | React 19 (Dec 2024) | Already clean |
| `<Context.Provider>` | `<Context value={}>` | React 19 (Dec 2024) | 3 files need update |
| `react-helmet` | Native metadata hoisting | React 19 (Dec 2024) | Next.js handles this |
| `useFormState` | `useActionState` | React 19 (Dec 2024) | Already using useActionState |

---

## Open Questions

1. **PPR with Better Auth session checks**
   - What we know: `src/proxy.ts` reads `better-auth.session_token` cookie. DAL functions also check auth.
   - What's unclear: Will `'use cache'` on DAL functions that check auth cause stale session data?
   - Recommendation: Never `'use cache'` on auth-checking functions. Only cache public data functions. Auth checks remain fully dynamic.

2. **shadcn form.tsx with Base UI**
   - What we know: `form.tsx` still imports `@radix-ui/react-slot`. All other components use Base UI.
   - What's unclear: Is there a Base UI `base-nova` version of the form component?
   - Recommendation: Check if `bun x shadcn@latest add form` would overwrite with Base UI version. If not, manually replace Slot usage or accept the single Radix dependency.

3. **Duplicate proxy.ts behavior**
   - What we know: Both `/proxy.ts` and `/src/proxy.ts` exist with different implementations.
   - What's unclear: Which one Next.js actually uses. The `src/` version is likely active since the project uses `src/` directory.
   - Recommendation: Delete root `/proxy.ts`, keep `src/proxy.ts`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Existing Test Coverage
The project has 18 test files in `src/__tests__/` covering auth, DAL, schema, validation, webhooks, cart, gift cards, RBAC, and more. This provides a solid foundation.

### Wave 0 Gaps
- [ ] No component tests (loading.tsx, error.tsx need visual verification)
- [ ] No PPR/cache integration tests
- [ ] No Suspense boundary tests

---

## Sources

### Primary (HIGH confidence)
- package.json, components.json, next.config.ts -- verified installed versions and configuration
- Source code grep -- verified feature usage across 197 files
- [Next.js 16 Blog](https://nextjs.org/blog/next-16) -- PPR, Cache Components, proxy.ts
- [Next.js 16.2 Blog](https://nextjs.org/blog/next-16-2) -- Turbopack, streaming improvements
- [Next.js Cache Components Docs](https://nextjs.org/docs/app/getting-started/cache-components)
- [React v19 Release](https://react.dev/blog/2024/12/05/react-19) -- All React 19 features
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog) -- Base UI, CLI v4

### Secondary (MEDIUM confidence)
- [TanStack Form v1 Announcement](https://tanstack.com/blog/announcing-tanstack-form-v1) -- Form comparison
- [TanStack Form Docs](https://tanstack.com/form/latest/docs/framework/react/quick-start) -- API details
- [shadcn/ui Components List](https://ui.shadcn.com/docs/components) -- Available components

### Tertiary (LOW confidence)
- Community blog posts on PPR migration patterns -- needs validation against official docs

## Metadata

**Confidence breakdown:**
- shadcn/ui + Base UI: HIGH -- verified from installed packages and source code
- Next.js 16 features: HIGH -- verified from official docs and current config
- React 19 features: HIGH -- verified from official React 19 release notes and source grep
- TanStack Form comparison: HIGH -- verified from npm registry and official docs
- PPR migration: MEDIUM -- patterns from blog posts, not yet tested in this codebase

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (30 days -- stable ecosystem)
