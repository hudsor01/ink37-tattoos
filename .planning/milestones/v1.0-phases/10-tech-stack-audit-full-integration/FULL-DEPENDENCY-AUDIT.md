# Full Dependency Audit: All 34 Runtime Dependencies

> Generated 2026-03-26 | Auditor: Claude Opus 4.6
> Method: grep all imports in `src/`, read every importing file, context7 doc lookup for major packages

---

## 1. @base-ui/react v1.3.0

**Files importing (18 files):**
- `src/components/ui/input.tsx` — Input primitive
- `src/components/ui/select.tsx` — Select primitive
- `src/components/ui/dropdown-menu.tsx` — Menu primitive
- `src/components/ui/button.tsx` — Button primitive
- `src/components/ui/separator.tsx` — Separator primitive
- `src/components/ui/sidebar.tsx` — mergeProps, useRender
- `src/components/ui/tabs.tsx` — Tabs primitive
- `src/components/ui/badge.tsx` — mergeProps, useRender
- `src/components/ui/breadcrumb.tsx` — mergeProps, useRender
- `src/components/ui/accordion.tsx` — Accordion primitive
- `src/components/ui/alert-dialog.tsx` — AlertDialog primitive
- `src/components/ui/sheet.tsx` — Dialog primitive (as SheetPrimitive)
- `src/components/ui/switch.tsx` — Switch primitive
- `src/components/ui/tooltip.tsx` — Tooltip primitive
- `src/components/ui/dialog.tsx` — Dialog primitive

**APIs used:**
- Primitives: `Input`, `Select`, `Menu`, `Button`, `Separator`, `Tabs`, `Accordion`, `AlertDialog`, `Dialog` (x2 — Dialog + Sheet), `Switch`, `Tooltip`
- Utilities: `mergeProps`, `useRender`
- 13 distinct component primitives + 2 utilities = 15 APIs

**APIs available but unused:**
- `Checkbox` — needed for data-table row selection, form checkboxes
- `Radio` / `RadioGroup` — useful for appointment type selection
- `Progress` — useful for multi-step forms, upload progress
- `Slider` — useful for price range filters in store
- `Popover` — useful for date pickers, rich tooltips
- `Collapsible` — useful for FAQ sections, mobile nav sub-menus
- `NumberInput` — useful for quantity inputs in store
- `PreviewCard` — hover preview cards
- `ScrollArea` — custom scrollable regions
- `Toggle` / `ToggleGroup` — gallery filter toggles
- `Fieldset` — form grouping with validation
- `Field` — form field primitives with validation states
- `NavigationMenu` — structured nav menus
- `Composite` — keyboard navigation for custom widgets

**Bundle impact:** ~45KB gzipped (tree-shakeable per-component imports)

**Recommendation:** INTEGRATE — add Checkbox (data tables), Progress (uploads), Popover (popovers), NumberInput (store quantities)

**Integration opportunities:**
- Replace custom gallery filter buttons with `ToggleGroup`
- Use `Checkbox` for DataTable row selection column
- Use `Progress` for media upload progress indicator
- Use `NumberInput` in store cart quantity controls
- Use `Popover` for dashboard filter dropdowns
- Use `Collapsible` for FAQ page (currently static)

---

## 2. @calcom/embed-react v1.5.3

**Files importing (1 file):**
- `src/components/public/cal-embed.tsx` — Cal default + getCalApi

**APIs used:**
- `Cal` (default export) — inline embed component
- `getCalApi` — runtime API for UI customization (`cal('ui', {...})`)

**APIs available but unused:**
- `Cal` with `config.layout: 'week_view'` — alternative layout
- Popup embed mode (`data-cal-link` attribute approach)
- Floating button embed mode
- Element click embed mode
- `cal('on', {...})` — event listeners for booking events (BOOKING_CREATED, etc.)
- `cal('preload', {...})` — preload calendar resources
- Namespace configuration for multiple embeds

**Bundle impact:** ~50KB gzipped (heavy due to iframe + runtime)

**Recommendation:** INTEGRATE — add event listeners for booking confirmation UX

**Integration opportunities:**
- Use `cal('on', { action: 'bookingSuccessful', callback: ... })` to show success toast and redirect after booking
- Use `cal('preload')` on booking page load for faster display
- Consider popup mode for a "Book Now" CTA button on homepage

---

## 3. @hookform/resolvers v5.2.2

**Files importing (5 files):**
- `src/components/store/gift-card-form.tsx`
- `src/components/dashboard/customer-form.tsx`
- `src/components/dashboard/session-form.tsx`
- `src/components/dashboard/product-form.tsx`
- `src/components/dashboard/appointment-form.tsx`

**APIs used:**
- `zodResolver` — single API, used everywhere

**APIs available but unused:**
- N/A for this project — `zodResolver` is the only resolver needed since Zod is the validation library. Other resolvers (yup, superstruct, joi, valibot, typebox, vest, effect) are irrelevant.

**Bundle impact:** ~2KB gzipped (zodResolver only, tree-shakes other resolvers)

**Recommendation:** KEEP as-is — perfectly utilized

**Integration opportunities:** None — already at optimal usage.

---

## 4. @neondatabase/serverless v1.0.2

**Files importing (0 direct imports in src/):**
- Used transitively by `drizzle-orm/neon-serverless` driver in `src/lib/db/index.ts`
- Referenced in `bun.lock` as direct dependency

**APIs used:**
- WebSocket transport layer (consumed by Drizzle internally)
- No direct API calls in application code

**APIs available but unused:**
- `neon()` — HTTP-only query function (alternative to WebSocket)
- `Pool` — connection pooling (using `pg.Pool` for Better Auth instead)
- `Client` — single connection client
- `neonConfig` — custom WebSocket/fetch configuration
- Transaction API — direct transactions (using Drizzle's instead)

**Bundle impact:** ~15KB gzipped

**Recommendation:** KEEP — required infrastructure dependency for Drizzle's neon-serverless driver

**Integration opportunities:** None — correct architectural decision to use Drizzle as the ORM layer rather than calling Neon directly.

---

## 5. @radix-ui/react-slot v1.2.4

**Files importing (1 file):**
- `src/components/ui/form.tsx` — `Slot` for FormControl composition

**APIs used:**
- `Slot` — renders child element with merged props

**APIs available but unused:**
- `Slottable` — for when you need to compose slot content with other elements

**Bundle impact:** ~1KB gzipped

**Recommendation:** KEEP as-is — legacy holdover from pre-Base UI shadcn. May eventually be replaceable if Base UI's `Field` primitive covers FormControl needs.

**Integration opportunities:** None needed — minimal, focused usage.

---

## 6. @tanstack/react-query v5.91.3

**Files importing (7 files):**
- `src/components/providers.tsx` — QueryClient, QueryClientProvider
- `src/components/dashboard/appointment-form.tsx` — useQueryClient
- `src/components/dashboard/customer-form.tsx` — useQueryClient
- `src/app/(dashboard)/dashboard/media/media-page-client.tsx` — useQuery, useQueryClient, useMutation
- `src/app/(dashboard)/dashboard/sessions/session-list-client.tsx` — useQuery, useQueryClient, useMutation
- `src/app/(dashboard)/dashboard/customers/customer-list-client.tsx` — useQuery, useQueryClient, useMutation
- `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx` — useQuery, useQueryClient, useMutation

**APIs used:**
- `QueryClient` — client instance creation
- `QueryClientProvider` — context provider
- `useQuery` — data fetching (4 dashboard lists)
- `useQueryClient` — cache invalidation after mutations (6 files)
- `useMutation` — mutation handling with onSuccess cache invalidation (4 files)

**APIs available but unused:**
- `useInfiniteQuery` — paginated/infinite scroll data loading
- `useSuspenseQuery` / `useSuspenseInfiniteQuery` — React Suspense integration
- `usePrefetchQuery` — prefetch on hover/focus
- `useQueries` — parallel queries
- `useIsFetching` / `useIsMutating` — global loading indicators
- `useMutationState` — track mutation state globally
- `queryOptions()` — type-safe query option factories
- `infiniteQueryOptions()` — type-safe infinite query options
- `keepPreviousData` — keep stale data during refetch (pagination)
- `QueryErrorResetBoundary` — error boundary integration
- `HydrationBoundary` / `dehydrate` — SSR prefetch hydration
- `placeholderData` — optimistic placeholder
- `select` — transform query data
- `enabled` — conditional queries

**Bundle impact:** ~40KB gzipped

**Recommendation:** INTEGRATE — significant untapped potential

**Integration opportunities:**
- Use `queryOptions()` factory pattern for type-safe, reusable query definitions across dashboard
- Add `HydrationBoundary` + `dehydrate` for SSR prefetching in dashboard list pages (faster initial loads)
- Use `keepPreviousData` in DataTable pagination to prevent flickering
- Use `useInfiniteQuery` for audit log (currently paginated client-side only)
- Use `usePrefetchQuery` to prefetch customer details on hover in customer list
- Use `QueryErrorResetBoundary` in dashboard layout for graceful error recovery
- Use `select` to transform API responses at the query level instead of in components

---

## 7. @tanstack/react-table v8.21.3

**Files importing (3 files):**
- `src/components/dashboard/data-table.tsx` — core table implementation
- `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx` — ColumnDef type
- `src/app/(dashboard)/dashboard/customers/customer-list-client.tsx` — ColumnDef type

**APIs used:**
- Types: `ColumnDef`, `SortingState`, `ColumnFiltersState`, `VisibilityState`, `RowSelectionState`
- Functions: `flexRender`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `useReactTable`

**APIs available but unused:**
- `getGroupedRowModel` — row grouping (e.g., group orders by status)
- `getExpandedRowModel` — expandable rows (e.g., order details inline)
- `getFacetedRowModel` / `getFacetedUniqueValues` / `getFacetedMinMaxValues` — faceted filter options
- `createColumnHelper` — type-safe column definition helper
- `GlobalFilterState` — global search across all columns
- `ColumnPinningState` — pin actions column
- `RowPinningState` — pin important rows
- Column resizing — drag-to-resize columns
- Manual sorting/filtering/pagination — server-side table state

**Bundle impact:** ~55KB gzipped

**Recommendation:** INTEGRATE — add faceted filters and column pinning

**Integration opportunities:**
- Use `getFacetedUniqueValues` for auto-generated filter options (e.g., status filter in appointments shows only existing statuses)
- Use `createColumnHelper` in column definition files for better type inference
- Use `getExpandedRowModel` for orders table (expand to see line items inline)
- Use column pinning to keep the actions column always visible on horizontal scroll
- Use `GlobalFilterState` for the search input to search across all columns simultaneously
- Consider server-side pagination for large datasets (manual mode)

---

## 8. @vercel/blob v2.3.1

**Files importing (2 files):**
- `src/app/api/upload/route.ts` — `put` (upload)
- `src/app/api/store/download/route.ts` — `head` (metadata check, dynamic import)

**APIs used:**
- `put` — upload files to blob storage
- `head` — check blob metadata (size, content type, URL)

**APIs available but unused:**
- `list` — list blobs in a directory/prefix
- `del` — delete blobs
- `copy` — copy blobs between paths
- Multipart upload: `createMultipartUpload`, `uploadPart`, `completeMultipartUpload`
- Client-side uploads via `handleUpload` / `upload` (direct browser-to-blob without server proxy)
- `createFolder` — organize blobs

**Bundle impact:** ~10KB gzipped

**Recommendation:** INTEGRATE — add del for media management, client upload for large files

**Integration opportunities:**
- Use `del` in media delete action (currently media entries are deleted from DB but blob storage not cleaned up — potential orphaned files)
- Use `list` in an admin media browser to show all stored files
- Use client-side `handleUpload` for large file uploads (bypasses 4.5MB server body limit)
- Use `copy` for creating thumbnails/variants

---

## 9. better-auth v1.5.5

**Files importing (4 files):**
- `src/lib/auth.ts` — betterAuth, nextCookies, admin plugin, Pool
- `src/lib/auth-client.ts` — createAuthClient, adminClient
- `src/app/api/auth/[...all]/route.ts` — toNextJsHandler

**Server APIs used:**
- `betterAuth()` — auth instance creation
- `nextCookies()` — Next.js cookie integration plugin
- `admin()` — admin role management plugin
- `toNextJsHandler()` — API route handler adapter
- `emailAndPassword: { enabled: true }` — email/password auth
- `databaseHooks.user.create.after` — post-registration customer linking
- `session` config (expiresIn, updateAge)
- `user.additionalFields` (role, banned, banReason, banExpires)
- `advanced.database.generateId: false` — use DB UUIDs

**Client APIs used:**
- `createAuthClient()` — client instance
- `adminClient()` — admin client plugin
- `signIn.email()` — email sign-in
- `signUp.email()` — email registration
- `signOut()` — sign out
- `useSession()` — session hook

**APIs/plugins available but unused:**
- **Plugins:** `twoFactor` (TOTP/SMS), `magicLink`, `passkey` (WebAuthn), `anonymous`, `oneTap` (Google), `organization`, `multiSession`, `openAPI`, `bearer`, `username`, `phoneNumber`, `emailOTP`, `oidcProvider`, `genericOAuth`
- **Client hooks:** `useListSessions`, `useActiveOrganization`
- **Server APIs:** `auth.api.listSessions`, `auth.api.revokeSession`, `auth.api.banUser`, `auth.api.unbanUser`, `auth.api.impersonateUser`, `auth.api.listUsers`, `auth.api.setRole`
- **Rate limiting:** Built-in rate limiter configuration
- **Email verification:** `sendVerificationEmail` option
- **Social auth:** Google, GitHub, Discord, etc. providers

**Bundle impact:** ~80KB gzipped (server), ~15KB gzipped (client)

**Recommendation:** INTEGRATE — add email verification, rate limiting, and social auth

**Integration opportunities:**
- Enable `emailVerification` with Resend (already have email infrastructure)
- Add `twoFactor` plugin for admin accounts (security for dashboard access)
- Configure built-in rate limiting for auth endpoints
- Use `auth.api.banUser` / `auth.api.unbanUser` in admin dashboard (fields exist in schema)
- Use `auth.api.listUsers` for admin user management page
- Use `auth.api.impersonateUser` for admin support/debugging
- Add Google OAuth via `socialProviders` for easier client registration
- Use `auth.api.setRole` for admin role management (currently manual DB)

---

## 10. class-variance-authority v0.7.1

**Files importing (4 files):**
- `src/components/ui/button.tsx` — cva, VariantProps
- `src/components/ui/sidebar.tsx` — cva, VariantProps
- `src/components/ui/badge.tsx` — cva, VariantProps
- `src/components/ui/tabs.tsx` — cva, VariantProps

**APIs used:**
- `cva()` — create variant class generator
- `VariantProps` — TypeScript type helper for variant props

**APIs available but unused:**
- That's the complete API. Fully utilized.

**Bundle impact:** ~2KB gzipped

**Recommendation:** KEEP as-is — complete utilization

**Integration opportunities:** None — this library has exactly 2 exports and both are used.

---

## 11. clsx v2.1.1

**Files importing (1 file):**
- `src/lib/utils.ts` — clsx, ClassValue

**APIs used:**
- `clsx()` — conditional class name builder
- `ClassValue` — TypeScript type for class inputs

**Usage breadth:** The `cn()` utility built on clsx is imported in **34 files** across the entire codebase.

**APIs available but unused:**
- That's the complete API. Fully utilized.

**Bundle impact:** ~0.5KB gzipped

**Recommendation:** KEEP as-is — foundational utility, complete utilization

**Integration opportunities:** None — used exactly as intended via the `cn()` wrapper.

---

## 12. date-fns v4.1.0

**Files importing (12 files):**
- `src/components/dashboard/order-detail.tsx` — format
- `src/app/(portal)/portal/page.tsx` — format, formatDistance
- `src/app/(dashboard)/dashboard/contacts/contacts-client.tsx` — format, formatDistance
- `src/app/(dashboard)/dashboard/page.tsx` — format
- `src/app/(dashboard)/dashboard/appointments/appointment-list-client.tsx` — format
- `src/app/(portal)/portal/tattoos/page.tsx` — format, formatDistance
- `src/app/(dashboard)/dashboard/orders/columns.tsx` — format, formatDistance
- `src/app/(portal)/portal/appointments/page.tsx` — format
- `src/app/(portal)/portal/payments/page.tsx` — format
- `src/app/(dashboard)/dashboard/customers/customer-list-client.tsx` — format, formatDistance
- `src/app/(dashboard)/dashboard/payments/columns.tsx` — format
- `src/app/(dashboard)/dashboard/customers/[id]/page.tsx` — format

**APIs used:**
- `format` — date formatting (12 files)
- `formatDistance` — relative time display, e.g., "3 days ago" (5 files)

**APIs available but unused (significant subset):**
- `formatRelative` — "last Friday at 5:00 PM"
- `formatDuration` / `intervalToDuration` — "2 hours 30 minutes" (useful for session durations)
- `isAfter` / `isBefore` / `isWithinInterval` — date comparison
- `addDays` / `addWeeks` / `addMonths` / `subDays` etc. — date arithmetic
- `differenceInDays` / `differenceInHours` / `differenceInMinutes` — time differences
- `startOfWeek` / `startOfMonth` / `endOfWeek` / `endOfMonth` — period boundaries
- `parseISO` — parse ISO strings
- `isValid` — validate date strings
- `isSameDay` / `isSameMonth` — date comparison
- `eachDayOfInterval` — generate date ranges (calendar views)
- `compareAsc` / `compareDesc` — sorting functions
- Locale support for internationalization

**Bundle impact:** ~7KB gzipped (tree-shakeable — only format + formatDistance are bundled)

**Recommendation:** INTEGRATE — use for session duration display and analytics

**Integration opportunities:**
- Use `formatDuration` + `intervalToDuration` to display tattoo session durations ("2h 30m" instead of raw minutes)
- Use `differenceInDays` for "days until appointment" in portal
- Use `isAfter`/`isBefore` for overdue appointment highlighting
- Use `startOfMonth`/`endOfMonth` in analytics date range calculations (currently using raw SQL)
- Use `eachDayOfInterval` if building a custom calendar/availability view
- Use `parseISO` for safer ISO string parsing instead of `new Date()`

---

## 13. drizzle-orm v0.45.1

**Files importing (24 files):**
- `src/lib/db/index.ts` — drizzle (neon-serverless driver)
- `src/lib/db/schema.ts` — pgTable, pgEnum, uuid, text, boolean, timestamp, integer, numeric, jsonb, uniqueIndex, index, relations
- `src/lib/auth.ts` — eq
- `src/lib/dal/sessions.ts` — eq, and, desc
- `src/lib/dal/media.ts` — eq, desc
- `src/lib/dal/contacts.ts` — desc, eq
- `src/lib/dal/payments.ts` — eq, and, sql, desc
- `src/lib/dal/audit.ts` — eq, and, desc
- `src/lib/dal/portal.ts` — eq, and, gte, not, sql, desc, asc
- `src/lib/dal/orders.ts` — eq, and, sql, desc, inArray
- `src/lib/dal/users.ts` — desc
- `src/lib/dal/designs.ts` — eq, and, desc
- `src/lib/dal/products.ts` — eq, asc, desc, sql
- `src/lib/dal/appointments.ts` — eq, and, gte, lte, desc, asc, sql
- `src/lib/dal/settings.ts` — eq, asc
- `src/lib/dal/analytics.ts` — eq, gte, and, sql, desc, asc
- `src/lib/dal/gift-cards.ts` — eq, and, gte, sql
- `src/lib/dal/customers.ts` — eq, or, ilike, desc
- `src/lib/actions/store-actions.ts` — eq, and, inArray
- `src/lib/actions/portal-actions.ts` — eq, and
- `src/app/api/store/download/route.ts` — eq, sql
- `src/app/(store)/store/checkout/success/page.tsx` — eq
- `src/app/api/webhooks/stripe/route.ts` — eq, and, or, sql
- `src/app/api/webhooks/cal/route.ts` — eq, ilike

**APIs used:**
- **Driver:** `drizzle()` (neon-serverless), `NeonDatabase` type
- **Schema builders:** `pgTable`, `pgEnum`, `uuid`, `text`, `boolean`, `timestamp`, `integer`, `numeric`, `jsonb`, `uniqueIndex`, `index`
- **Relations:** `relations`, `one`, `many`
- **Operators:** `eq`, `and`, `or`, `not`, `gte`, `lte`, `desc`, `asc`, `sql`, `ilike`, `inArray`
- **Query API:** `db.query.*` with `with` for relational queries, `db.select()`, `db.insert()`, `db.update()`, `db.delete()`
- **Schema modifiers:** `.notNull()`, `.default()`, `.defaultRandom()`, `.primaryKey()`, `.unique()`, `.references()`, `.array()`, `$onUpdate()`, `mode: 'number'`

**APIs available but unused:**
- **Aggregation helpers:** `count()`, `sum()`, `avg()`, `min()`, `max()` — currently using raw `sql` template literals
- **Operators:** `exists`, `notExists`, `between`, `isNull`, `isNotNull`, `arrayContains`, `arrayContained`, `arrayOverlaps`, `like`, `notIlike`, `ne`
- **Transactions:** `db.transaction()` — atomic multi-table operations
- **Prepared statements:** `.prepare()` — reusable parameterized queries
- **Dynamic queries:** `$dynamic` — conditional where clauses
- **CTE (Common Table Expressions):** `$with` — complex recursive queries
- **Set operations:** `union`, `intersect`, `except`
- **Subqueries:** `db.select().from(subquery)`
- **Schema introspection:** `getTableColumns()`
- **Coalesce:** `sql.coalesce()` for null handling

**Bundle impact:** ~30KB gzipped (tree-shakeable)

**Recommendation:** INTEGRATE — use aggregation helpers, transactions, and prepared statements

**Integration opportunities:**
- Replace raw `sql\`count(...)\`` with `count()` helper in analytics DAL for type safety
- Replace raw `sql\`sum(...)\`` with `sum()` helper in payment/order calculations
- Use `db.transaction()` in store checkout flow (create order + order items + apply gift card atomically)
- Use `db.transaction()` in payment webhook processing (update payment + update session paidAmount atomically)
- Use `.prepare()` for frequently-called queries (getCurrentSession, getCustomerByEmail)
- Use `$dynamic` for building filter queries in DAL functions with optional parameters
- Use `between` operator instead of `and(gte(...), lte(...))` in date range queries
- Use `isNull` / `isNotNull` for null checks instead of custom SQL

---

## 14. framer-motion v12.38.0

**Files importing (2 files):**
- `src/components/public/hero-section.tsx` — motion (motion.div with initial/animate/transition)
- `src/components/public/gallery-grid.tsx` — motion (motion.div with layout animation)

**APIs used:**
- `motion` — motion.div with basic `initial`, `animate`, `transition` props
- Layout animations in gallery grid

**APIs available but unused:**
- `AnimatePresence` — exit animations (page transitions, modal enter/exit)
- `useAnimation` — programmatic animation control
- `useMotionValue` / `useTransform` — scroll-linked animations
- `useScroll` — scroll progress tracking
- `useSpring` — physics-based animations
- `useInView` — intersection observer-based animations
- `LayoutGroup` — shared layout animations across components
- `Reorder` — drag-to-reorder lists
- `LazyMotion` / `domAnimation` — reduce bundle with lazy loading
- `variants` — named animation states for staggered children
- `drag` — drag gesture handling
- `whileHover` / `whileTap` / `whileInView` — gesture-triggered animations
- `stagger` — staggered child animations
- `AnimateNumber` — animated number transitions

**Bundle impact:** ~95KB gzipped (heavy! only using ~5% of features)

**Recommendation:** INTEGRATE selectively or consider `LazyMotion` to reduce bundle

**Integration opportunities:**
- Use `LazyMotion` + `domAnimation` to reduce initial bundle (~50% reduction)
- Use `AnimatePresence` for page transitions between routes
- Use `useInView` for scroll-triggered fade-in on services/about page sections
- Use `variants` + stagger for gallery grid item entrance animations
- Use `whileHover` for card hover effects (portfolio, products)
- Use `Reorder` for admin drag-to-reorder products (sortOrder field exists)
- **WARNING:** At ~95KB, this is the heaviest client-side dep. Consider `LazyMotion` as minimum optimization.

---

## 15. lucide-react v0.462.0

**Files importing (53 files):**
- 23 UI components, 15 dashboard files, 8 public site files, 4 portal files, 3 store files

**Icons used (~65 distinct icons):**
Menu, Plus, Trash2, Image, Minus, ShoppingBag, ShoppingCart, Loader2, Instagram, Facebook, ChevronLeft, ChevronRight, Share2, Calendar, Palette, CreditCard, AlertCircle, Upload, FileImage, Truck, PackageCheck, XCircle, RotateCcw, Download, Mail, MapPin, Phone, Clock, ArrowUp, ArrowDown, Search, MoreHorizontal, Pencil, DollarSign, ArrowDownRight, ExternalLink, Eye, Check, X, LogOut, LayoutDashboard, PenTool, MessageCircle, Pen, RefreshCw, CheckCircle, CheckCircle2, ShieldCheck, Package, SlidersHorizontal, ArrowUpDown, PanelLeftIcon, XIcon, ChevronDownIcon, CheckIcon, ChevronUpIcon, ChevronRightIcon, MoreHorizontalIcon, MessageSquare, Users, BarChart3, ImageIcon, Settings, Briefcase, Activity, Layers, LucideIcon (type)

**APIs available but unused:**
- This is an icon library with 1500+ icons. Usage pattern is correct — import only what you need.
- `createLucideIcon` — create custom icons following Lucide conventions
- `iconNode` — access raw SVG path data

**Bundle impact:** ~0.5KB per icon used (tree-shakeable). Total: ~32KB for 65 icons.

**Recommendation:** KEEP as-is — correct usage pattern

**Integration opportunities:** None specific — already importing on-demand. Consider the `lucide-react/dynamicIconImports` for dynamic icon selection in admin settings if needed.

---

## 16. next v16.2.0

**Files importing (90+ files):**
Pervasive across entire codebase — every page, layout, component, action, and route handler.

**APIs used:**
- **Components:** `Image`, `Link`
- **Navigation:** `useRouter`, `usePathname`, `redirect`, `notFound`
- **Server:** `NextResponse`, `NextRequest`, `headers`, `after`
- **Cache:** `revalidatePath`
- **Font:** `Geist` (next/font/google)
- **Types:** `Metadata`, `MetadataRoute`
- **Dynamic:** `dynamic` (lazy imports)

**APIs available but unused:**
- `generateStaticParams` — static generation for dynamic routes
- `generateMetadata` — dynamic metadata function (using static Metadata objects)
- `loading.tsx` — streaming loading UI
- `error.tsx` — error boundary pages
- `not-found.tsx` — exists at app root but not per-route
- `revalidateTag` — tag-based cache revalidation
- `unstable_cache` — data cache with tags
- `cookies()` — direct cookie access (using Better Auth instead)
- `draftMode()` — preview mode
- Parallel routes (`@folder`)
- Intercepting routes (`(.)folder`)
- Route groups with layouts — already using `(public)`, `(dashboard)`, `(portal)`, `(store)`, `(auth)`
- `Suspense` boundaries — streaming SSR
- Middleware (`middleware.ts`) — have `proxy.ts` but not standard middleware

**Bundle impact:** Framework — not separately measured

**Recommendation:** INTEGRATE — add loading.tsx, error.tsx, generateMetadata, and Suspense

**Integration opportunities:**
- Add `loading.tsx` in dashboard route group for skeleton loading states
- Add `error.tsx` in each route group for graceful error handling
- Use `generateMetadata` for dynamic page titles (customer detail, order detail, product pages)
- Use `generateStaticParams` for store product pages (static generation)
- Add `Suspense` boundaries around data-fetching components for streaming
- Use `revalidateTag` for more granular cache invalidation (instead of `revalidatePath` which invalidates everything)
- Convert `proxy.ts` to proper `middleware.ts` for auth route protection
- Add `not-found.tsx` per route group for contextual 404 pages

---

## 17. next-themes v0.4.6

**Files importing (1 file):**
- `src/components/providers.tsx` — ThemeProvider

**APIs used:**
- `ThemeProvider` — wraps app with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`

**APIs available but unused:**
- `useTheme()` hook — access/toggle current theme
- `resolvedTheme` — system-resolved theme value
- `setTheme()` — programmatic theme switching
- `systemTheme` — the user's OS preference
- `themes` — list of available themes
- `forcedTheme` — force a specific theme per page

**Bundle impact:** ~2KB gzipped

**Recommendation:** INTEGRATE — add theme toggle using useTheme

**Integration opportunities:**
- Add a dark/light mode toggle button in the dashboard header using `useTheme()`
- Use `forcedTheme` to keep public site always light while dashboard supports dark mode
- Currently `enableSystem={false}` — consider enabling for dashboard users who prefer dark mode

---

## 18. nuqs v2.8.9

**Files importing (3 files):**
- `src/components/providers.tsx` — NuqsAdapter
- `src/components/public/gallery-filter-bar.tsx` — useQueryStates, parseAsString
- `src/components/public/gallery-grid.tsx` — useQueryStates (reads filter state)

**APIs used:**
- `NuqsAdapter` — Next.js App Router adapter
- `useQueryStates` — multi-key URL state management
- `parseAsString` — string parser for URL params

**APIs available but unused:**
- `useQueryState` — single key URL state (simpler API)
- `parseAsInteger` / `parseAsFloat` — numeric URL params
- `parseAsBoolean` — boolean URL params
- `parseAsJson` — JSON URL params
- `parseAsArrayOf` — array URL params (e.g., multi-select filters)
- `parseAsStringEnum` — type-safe enum URL params
- `parseAsIsoDateTime` — date URL params
- `parseAsTimestamp` — timestamp URL params
- `createSearchParamsCache` — server-side URL state reading
- `createParser` — custom parser factory
- `serialize` — URL string serialization
- `shallow: true/false` options — already using `shallow: false`
- `history: 'push' | 'replace'` — navigation mode control

**Bundle impact:** ~5KB gzipped

**Recommendation:** INTEGRATE — use for dashboard table filters and pagination

**Integration opportunities:**
- Use `parseAsInteger` for dashboard table pagination page number in URL
- Use `parseAsStringEnum` for status filter tabs in appointment/session lists
- Use `parseAsArrayOf(parseAsString)` for multi-select gallery filters
- Use `createSearchParamsCache` for server-side reading of dashboard filters (SSR filtering)
- Use nuqs for dashboard search queries (persist search across navigation)
- Use for store product category/type filtering

---

## 19. pg v8.13.1

**Files importing (1 file):**
- `src/lib/auth.ts` — Pool (for Better Auth raw connection)

**APIs used:**
- `Pool` — connection pool for Better Auth's database adapter

**APIs available but unused:**
- `Client` — single connection (not needed with Pool)
- `types` — custom type parsers
- `native` — native bindings

**Bundle impact:** ~50KB gzipped (Node.js native module, not bundled to client)

**Recommendation:** KEEP as-is — correctly used for Better Auth's raw pg.Pool requirement. Better Auth doesn't support Drizzle adapter for full feature decoupling (per CLAUDE.md architecture decision).

**Integration opportunities:** None — using exactly as architecturally intended.

---

## 20. react v19.2.3

**Files importing (65+ files):**
Every client component in the codebase.

**APIs used:**
- **Hooks:** `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`, `useTransition`, `useActionState`, `useId`, `useContext`
- **Functions:** `createContext`, `cache` (React 19 server cache)
- **Namespace:** `React.ComponentProps`, `React.ReactNode`, etc.

**APIs available but unused:**
- `use` — new React 19 hook for reading promises/context
- `useDeferredValue` — defer expensive re-renders
- `useSyncExternalStore` — subscribe to external stores (zustand uses internally)
- `useOptimistic` — optimistic UI updates
- `Suspense` — loading boundaries
- `startTransition` — standalone (using `useTransition` hook instead)
- `lazy` — code splitting (using `next/dynamic` instead)
- `forwardRef` — deprecated in React 19 (ref is a regular prop now)

**Bundle impact:** Framework — not separately measured

**Recommendation:** INTEGRATE — use `useOptimistic` and `use`

**Integration opportunities:**
- Use `useOptimistic` for instant UI feedback on mutations (e.g., optimistic status changes in appointment list)
- Use `use` hook to read promises in client components (cleaner than useEffect data fetching)
- Use `useDeferredValue` for search input debouncing in DataTable (instead of custom debounce)

---

## 21. react-day-picker v9.14.0

**Files importing: 0 files**

**APIs used:** NONE

**Evidence:** Zero imports found across entire `src/` directory. No calendar/date-picker UI component exists in `src/components/ui/`. This was likely installed by shadcn's calendar component template but never used, or was replaced when migrating to @base-ui/react.

**Bundle impact:** 0KB (not imported, tree-shaken out)

**Recommendation:** REMOVE — completely unused dependency

**Integration opportunities:** If a date picker is needed for appointment scheduling forms, this could be re-added. But the appointment forms currently use text input for dates, or the date picker could be built with @base-ui/react primitives instead.

---

## 22. react-dom v19.2.3

**Files importing: 0 direct imports**

**APIs used:**
- Used implicitly by Next.js for server-side rendering, hydration, and client rendering
- This is expected — direct react-dom imports are rare in Next.js apps

**APIs available but unused (direct):**
- `createPortal` — render outside DOM hierarchy (modals already handled by Dialog primitive)
- `flushSync` — force synchronous updates
- `hydrateRoot` / `createRoot` — managed by Next.js
- `preconnect` / `prefetchDNS` / `preload` / `preinit` — resource hints (React 19)

**Bundle impact:** Framework — required peer dependency

**Recommendation:** KEEP as-is — required by React/Next.js. No direct usage needed.

**Integration opportunities:** None — Next.js manages all react-dom interactions.

---

## 23. react-hook-form v7.71.2

**Files importing (6 files):**
- `src/components/ui/form.tsx` — Controller, FormProvider, useFormContext, ControllerProps, FieldPath, FieldValues
- `src/components/store/gift-card-form.tsx` — useForm
- `src/components/dashboard/appointment-form.tsx` — useForm
- `src/components/dashboard/product-form.tsx` — useForm
- `src/components/dashboard/customer-form.tsx` — useForm
- `src/components/dashboard/session-form.tsx` — useForm

**APIs used:**
- `useForm` — form state management (5 forms)
- `Controller` — controlled field wrapper
- `FormProvider` — form context provider
- `useFormContext` — consume form context
- Types: `ControllerProps`, `FieldPath`, `FieldValues`

**APIs available but unused:**
- `useFieldArray` — dynamic arrays (add/remove items, e.g., allergies list, order line items)
- `useWatch` — watch specific field values reactively
- `useFormState` — subscribe to form state (dirty, errors, isValid)
- `register` — uncontrolled inputs (using Controller pattern instead)
- `setValue` / `getValues` — programmatic field access
- `trigger` — manual validation
- `setError` / `clearErrors` — programmatic error management
- `reset` — reset form to default/new values
- `handleSubmit` — might be used via useForm destructuring (would need deeper check)
- `setFocus` — focus a specific field
- `formState.dirtyFields` — track which fields changed

**Bundle impact:** ~25KB gzipped

**Recommendation:** INTEGRATE — add useFieldArray for dynamic lists

**Integration opportunities:**
- Use `useFieldArray` for customer allergies/medical conditions arrays (currently a single text field)
- Use `useFieldArray` for product variants if multi-variant products are added
- Use `useWatch` to reactively update totalCost when hourlyRate/estimatedHours change in session form
- Use `reset` for "Reset Form" functionality in admin forms
- Use `setFocus` to auto-focus first field with error after validation

---

## 24. recharts v2.15.4

**Files importing (2 files):**
- `src/components/dashboard/analytics-chart.tsx` — AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis
- `src/components/ui/chart.tsx` — RechartsPrimitive namespace (for shadcn chart wrapper)

**APIs used:**
- Chart types: `AreaChart`, `BarChart`, `PieChart`
- Elements: `Area`, `Bar`, `Pie`, `Cell`, `XAxis`, `YAxis`

**APIs available but unused:**
- **Chart types:** `LineChart`, `ComposedChart`, `ScatterChart`, `RadarChart`, `RadialBarChart`, `FunnelChart`, `Treemap`, `Sankey`
- **Elements:** `Line`, `Scatter`, `Radar`, `RadialBar`, `Funnel`
- **Layout:** `CartesianGrid`, `Legend` (using ChartLegend wrapper), `Tooltip` (using ChartTooltip wrapper), `ResponsiveContainer`
- **Interaction:** `Brush` (zoom/pan), `ReferenceArea`, `ReferenceLine`, `ReferenceDot`
- **Labels:** `Label`, `LabelList`
- **Customization:** `customized` prop, `activeShape`

**Bundle impact:** ~130KB gzipped (heavy! but tree-shakeable by chart type)

**Recommendation:** INTEGRATE — add CartesianGrid, ReferenceLine, and LineChart

**Integration opportunities:**
- Add `CartesianGrid` to AreaChart and BarChart for better readability
- Use `LineChart` for trend lines (revenue trend, client acquisition trend)
- Use `ComposedChart` to overlay revenue bars with session count line
- Use `ReferenceLine` for target/goal markers on revenue chart
- Use `Brush` for zooming into date ranges on long-term charts
- Use `RadialBarChart` for dashboard KPI ring indicators
- Use `LabelList` for data point labels on bar chart

---

## 25. resend v6.9.4

**Files importing (1 file + 5 references):**
- `src/lib/email/resend.ts` — Resend constructor, emails.send
- Referenced via imports of exported functions in: payment-actions, contact-actions, stripe webhook route, tests

**APIs used:**
- `new Resend(apiKey)` — client construction
- `resend.emails.send()` — send individual emails (5 email functions: contact notification, contact confirmation, payment request, order confirmation, gift card delivery, gift card purchase confirmation)

**APIs available but unused:**
- `emails.get(id)` — retrieve email status by ID
- `emails.update(id)` — update scheduled email
- `emails.batch.send()` — batch email sending (up to 100 at once)
- `emails.batch.create()` — batch with individual customization
- `contacts.*` — contact list management (create, get, update, remove)
- `audiences.*` — audience/list management
- `domains.*` — domain management
- `apiKeys.*` — API key management
- React email templates (JSX instead of HTML strings)
- Scheduled emails (`scheduledAt` parameter)

**Bundle impact:** ~5KB gzipped (server-only)

**Recommendation:** INTEGRATE — add batch emails and email status tracking

**Integration opportunities:**
- Use `emails.batch.send()` for bulk operations (e.g., appointment reminders to multiple customers — `reminderSent` field exists in schema)
- Use `emails.get()` to track email delivery status and store in audit log
- Use `scheduledAt` for scheduling appointment reminder emails ahead of time
- Use React email templates instead of HTML string templates for better maintainability
- Use `contacts` API to build a customer email list for marketing

---

## 26. server-only v0.0.1

**Files importing (18 files):**
- `src/lib/stripe.ts`
- `src/lib/env.ts`
- `src/lib/db/index.ts`
- `src/lib/email/resend.ts`
- `src/lib/auth.ts`
- `src/lib/dal/sessions.ts`
- `src/lib/dal/media.ts`
- `src/lib/dal/contacts.ts`
- `src/lib/dal/payments.ts`
- `src/lib/dal/audit.ts`
- `src/lib/dal/portal.ts`
- `src/lib/dal/users.ts`
- `src/lib/dal/designs.ts`
- `src/lib/dal/appointments.ts`
- `src/lib/dal/orders.ts`
- `src/lib/dal/analytics.ts`
- `src/lib/dal/products.ts`
- `src/lib/dal/settings.ts`
- `src/lib/dal/customers.ts`
- `src/lib/dal/gift-cards.ts`

**APIs used:**
- Side-effect import `import 'server-only'` — build-time boundary guard. That is the complete API.

**Bundle impact:** 0KB (build-time only, no runtime code)

**Recommendation:** KEEP as-is — critical security boundary. Tests verify its presence.

**Integration opportunities:** Ensure all server action files also import it (currently only DAL + lib files). Server actions in `src/lib/actions/` should also guard with `server-only`.

---

## 27. shadcn v4.1.0

**Files importing (1 file):**
- `src/app/globals.css` — `@import "shadcn/tailwind.css"` (CSS theme tokens)

**APIs used:**
- Tailwind CSS theme layer import (CSS custom properties for colors, radii, shadows)
- CLI tool for adding/updating components (`bunx shadcn add <component>`)

**APIs available but unused:**
- N/A — this is a CLI + CSS theme package. All runtime components are in `src/components/ui/`.
- CLI commands: `shadcn add`, `shadcn init`, `shadcn diff`

**Bundle impact:** ~3KB CSS (theme tokens only)

**Recommendation:** KEEP as-is — design system foundation

**Integration opportunities:** Use `bunx shadcn add` to scaffold new UI components (Calendar, DatePicker, etc.) when needed rather than building from scratch.

---

## 28. sonner v2.0.7

**Files importing (17 files):**
- `src/components/providers.tsx` — Toaster
- 16 component/page files — toast, toast.promise, toast.success, toast.error

**APIs used:**
- `Toaster` — toast container component (position: bottom-right)
- `toast.success()` — success notifications (3 files)
- `toast.error()` — error notifications (8 files)
- `toast.promise()` — loading/success/error for async operations (15 usages across 12 files)

**APIs available but unused:**
- `toast.warning()` — warning notifications
- `toast.info()` — informational notifications
- `toast.loading()` — standalone loading toast (using promise instead)
- `toast.dismiss()` — programmatic dismiss
- `toast.custom()` — fully custom toast UI
- `toast.message()` — simple message toast
- Action buttons within toast (`action` prop) — e.g., "Undo" button on delete
- Description text in toast
- `toast.promise` with description — already using but could add descriptions
- Duration customization per toast
- `richColors` — enhanced color scheme on Toaster
- `closeButton` — show close button on each toast
- `expand` — expand toasts on hover

**Bundle impact:** ~8KB gzipped

**Recommendation:** INTEGRATE — add action buttons and richColors

**Integration opportunities:**
- Add "Undo" action button on delete toasts (customer, appointment, session delete)
- Enable `richColors` on Toaster for better visual distinction
- Add `closeButton` on Toaster for manual toast dismissal
- Use `toast.warning()` for "are you sure" type notifications before destructive actions
- Use `toast.info()` for informational messages (e.g., "No new appointments today")
- Add `description` to toast.promise for more context on what's happening

---

## 29. stripe v20.4.1

**Files importing (12 files):**
- `src/lib/stripe.ts` — Stripe constructor, dollarsToStripeCents, stripeCentsToDollars
- `src/lib/dal/payments.ts` — stripe.customers.create
- `src/lib/actions/payment-actions.ts` — stripe.checkout.sessions.create (x2)
- `src/lib/actions/store-actions.ts` — stripe.checkout.sessions.create
- `src/lib/actions/product-actions.ts` — stripe.products.create, stripe.prices.create, stripe.prices.update, stripe.products.update
- `src/lib/actions/gift-card-actions.ts` — stripe.checkout.sessions.create
- `src/lib/actions/order-actions.ts` — stripe.refunds.create
- `src/app/api/webhooks/stripe/route.ts` — stripe.webhooks.constructEvent, stripe.paymentIntents.retrieve
- Tests — mocked stripe

**APIs used:**
- `new Stripe(key, config)` — client construction
- `checkout.sessions.create()` — payment pages (4 usages)
- `customers.create()` — Stripe customer creation
- `products.create()` / `products.update()` — product sync
- `prices.create()` / `prices.update()` — price sync
- `webhooks.constructEvent()` — webhook verification
- `paymentIntents.retrieve()` — payment status check
- `refunds.create()` — process refunds

**APIs available but unused:**
- `subscriptions.*` — recurring billing (memberships, aftercare plans)
- `invoices.*` — invoice generation and management
- `setupIntents.*` — save payment methods for later
- `paymentMethods.*` — manage saved cards
- `accounts.*` (Connect) — multi-artist payouts
- `transfers.*` — send funds to connected accounts
- `coupons.*` / `promotionCodes.*` — discount codes
- `shippingRates.*` — shipping rate management
- `tax.*` — automatic tax calculation
- `billingPortal.*` — customer self-service billing
- `checkout.sessions.listLineItems()` — retrieve line items
- `checkout.sessions.retrieve()` — get session details
- `customers.list()` / `customers.retrieve()` — customer lookup
- `paymentIntents.create()` — custom payment flows
- `balance.*` — account balance
- `payouts.*` — payout management

**Bundle impact:** ~80KB gzipped (server-only, Node.js SDK)

**Recommendation:** INTEGRATE — add promotion codes and tax calculation

**Integration opportunities:**
- Use `promotionCodes` for store discount codes
- Use `tax` for automatic sales tax calculation
- Use `checkout.sessions.retrieve()` for better post-checkout verification
- Use `setupIntents` + `paymentMethods` to save cards for returning customers
- Use `invoices` for generating PDF invoices for tattoo sessions
- Use `billingPortal` for customer self-service payment method management in portal
- Use `shippingRates` for dynamic shipping calculation in store checkout
- Consider `Connect` for future multi-artist payout splitting

---

## 30. tailwind-merge v3.4.0

**Files importing (1 file):**
- `src/lib/utils.ts` — twMerge

**APIs used:**
- `twMerge()` — merge Tailwind classes with intelligent deduplication

**Usage breadth:** Used via the `cn()` wrapper in **34 files**.

**APIs available but unused:**
- `extendTailwindMerge()` — extend with custom Tailwind config (custom utilities, colors)
- `twJoin()` — join classes without merge (faster, no deduplication)

**Bundle impact:** ~7KB gzipped

**Recommendation:** KEEP as-is — core utility. Consider `extendTailwindMerge` only if custom Tailwind utilities cause conflicts.

**Integration opportunities:** If custom Tailwind utilities are added (e.g., custom spacing, brand colors), `extendTailwindMerge` ensures they're properly deduplicated.

---

## 31. tw-animate-css v1.4.0

**Files importing (1 file):**
- `src/app/globals.css` — `@import "tw-animate-css"`

**APIs used:**
- CSS animation utility classes (fade-in, slide-in, etc.) as Tailwind utilities

**APIs available but unused:**
- Full animation class library — usage depends on which animation classes are used in component className props. This is a CSS utility library; all classes are available by default.

**Bundle impact:** ~5KB CSS

**Recommendation:** KEEP as-is — provides animation utilities for shadcn components (dialog enter/exit, dropdown appear, etc.)

**Integration opportunities:** None specific — animations are applied via Tailwind classes in components.

---

## 32. ws v8.20.0

**Files importing (1 file):**
- `src/lib/db/index.ts` — default export (WebSocket class, passed as `ws` option to drizzle neon driver)

**APIs used:**
- WebSocket class — provided to Drizzle's neon-serverless driver for WebSocket transport in Node.js environments

**APIs available but unused:**
- `WebSocketServer` — create WebSocket server (for real-time features)
- `createWebSocketStream` — duplex stream interface
- Per-message compression options
- Custom headers/protocols

**Bundle impact:** ~15KB gzipped (server-only, Node.js native)

**Recommendation:** KEEP — required infrastructure dependency for @neondatabase/serverless

**Integration opportunities:** Could use `WebSocketServer` for real-time dashboard updates (new appointments, payment notifications), but this would be a significant architectural addition. Not recommended as a quick win.

---

## 33. zod v4.3.6

**Files importing (5 files):**
- `src/lib/env.ts` — z.object, z.string, z.url, z.email
- `src/lib/security/validation.ts` — z.object, z.string, z.number, z.boolean, z.enum, z.literal, z.array, z.record, z.unknown, .min, .max, .email, .optional, .default, .uuid, .datetime, .positive, .nonnegative, .int, .regex, .passthrough, .partial, .extend, .infer
- `src/components/store/gift-card-form.tsx` — z (client-side validation)
- `src/components/dashboard/session-form.tsx` — z (client-side validation)
- `src/__tests__/env.test.ts` — z (test)

**APIs used:**
- Schema types: `z.object`, `z.string`, `z.number`, `z.boolean`, `z.enum`, `z.literal`, `z.array`, `z.record`, `z.unknown`
- Refinements: `.min()`, `.max()`, `.email()`, `.uuid()`, `.datetime()`, `.positive()`, `.nonnegative()`, `.int()`, `.regex()`, `.url()`
- Modifiers: `.optional()`, `.default()`, `.passthrough()`, `.partial()`, `.extend()`
- Type inference: `z.infer<typeof schema>`

**APIs available but unused (Zod 4 new features):**
- `z.templateLiteral()` — NEW in v4: template literal type schemas
- `z.file()` — NEW in v4: File validation with `.min()`, `.max()`, `.mime()`
- Top-level validators: `z.email()`, `z.uuid()`, `z.url()` — NEW in v4 (replaces `z.string().email()`)
- `z.pipe()` — pipeline transformations
- `z.transform()` — output transformation
- `z.coerce` — type coercion (coerce.number, coerce.date, etc.)
- `z.discriminatedUnion()` — tagged union types
- `z.lazy()` — recursive schemas
- `z.preprocess()` — input preprocessing
- `z.brand()` — branded types
- `z.catch()` — catch with default values
- `z.promise()` — promise validation
- `z.date()` — native Date validation
- `z.set()` / `z.map()` / `z.tuple()` — collection types
- `zod/mini` — NEW in v4: 6.6x smaller bundle variant
- Internationalization — custom error maps

**Bundle impact:** ~15KB gzipped (standard), ~2.5KB (zod/mini)

**Recommendation:** INTEGRATE — adopt Zod 4 features + consider zod/mini for client

**Integration opportunities:**
- Use `z.file()` for upload validation in media-uploader and product-form (validate size + MIME type before upload)
- Use `z.coerce.number()` for form inputs that come in as strings (appointment duration, prices)
- Migrate `z.string().email()` to `z.email()` (Zod 4 top-level API, better tree-shaking)
- Migrate `z.string().uuid()` to `z.uuid()` (Zod 4 top-level API)
- Migrate `z.string().url()` to `z.url()` (Zod 4 top-level API — already used in env.ts!)
- Use `z.discriminatedUnion()` for webhook payload types (discriminate by triggerEvent)
- Consider `zod/mini` for client-side form validation to reduce bundle by ~12KB
- Use `z.pipe()` for composing validation + transformation chains

---

## 34. zustand v5.0.12

**Files importing (1 file, used in 6 files):**
- `src/stores/cart-store.ts` — create, persist middleware
- Used by: cart-icon, clear-cart, add-to-cart-button, cart-drawer, cart-store test

**APIs used:**
- `create` — store creation
- `persist` middleware — localStorage persistence (`ink37-cart` key)
- Store features: `set`, `get` in store creators

**APIs available but unused:**
- `devtools` middleware — Redux DevTools integration for debugging
- `immer` middleware — immutable updates with mutable syntax
- `subscribeWithSelector` middleware — fine-grained subscriptions
- `combine` middleware — split state and actions
- `createStore` — vanilla (non-React) store
- `createWithEqualityFn` — custom equality for selectors
- `shallow` — shallow comparison for selector optimization
- `useShallow` — shallow selector hook (v5)
- `createJSONStorage` — custom storage adapters
- `persist.getOptions()` — runtime persistence config
- `persist.rehydrate()` — manual rehydration
- `persist.hasHydrated()` — hydration status check

**Bundle impact:** ~3KB gzipped

**Recommendation:** INTEGRATE — add devtools and additional stores

**Integration opportunities:**
- Add `devtools` middleware to cart store for debugging (wrap: `devtools(persist(...), { name: 'cart-store' })`)
- Use `persist.hasHydrated()` to prevent hydration mismatch on cart icon count (SSR/client mismatch is a common issue)
- Create additional stores for: dashboard sidebar state, form draft auto-save, user preferences
- Use `subscribeWithSelector` for reacting to specific cart changes (e.g., analytics event when item added)
- Use `useShallow` for selecting multiple values without unnecessary re-renders

---

# Summary Table

| # | Package | Version | Files | APIs Used | Recommendation | Priority |
|---|---------|---------|-------|-----------|---------------|----------|
| 1 | @base-ui/react | 1.3.0 | 18 | 15 primitives | INTEGRATE | Medium |
| 2 | @calcom/embed-react | 1.5.3 | 1 | Cal, getCalApi | INTEGRATE | Low |
| 3 | @hookform/resolvers | 5.2.2 | 5 | zodResolver | KEEP | - |
| 4 | @neondatabase/serverless | 1.0.2 | 0 (transitive) | WebSocket transport | KEEP | - |
| 5 | @radix-ui/react-slot | 1.2.4 | 1 | Slot | KEEP | - |
| 6 | @tanstack/react-query | 5.91.3 | 7 | 5 hooks/classes | INTEGRATE | High |
| 7 | @tanstack/react-table | 8.21.3 | 3 | 11 APIs | INTEGRATE | Medium |
| 8 | @vercel/blob | 2.3.1 | 2 | put, head | INTEGRATE | High |
| 9 | better-auth | 1.5.5 | 4 | 12 server+client APIs | INTEGRATE | High |
| 10 | class-variance-authority | 0.7.1 | 4 | cva, VariantProps | KEEP | - |
| 11 | clsx | 2.1.1 | 1 (34 via cn) | clsx, ClassValue | KEEP | - |
| 12 | date-fns | 4.1.0 | 12 | format, formatDistance | INTEGRATE | Medium |
| 13 | drizzle-orm | 0.45.1 | 24 | 30+ APIs | INTEGRATE | High |
| 14 | framer-motion | 12.38.0 | 2 | motion only | INTEGRATE/OPTIMIZE | High |
| 15 | lucide-react | 0.462.0 | 53 | ~65 icons | KEEP | - |
| 16 | next | 16.2.0 | 90+ | 15+ APIs | INTEGRATE | High |
| 17 | next-themes | 0.4.6 | 1 | ThemeProvider | INTEGRATE | Low |
| 18 | nuqs | 2.8.9 | 3 | 3 APIs | INTEGRATE | Medium |
| 19 | pg | 8.13.1 | 1 | Pool | KEEP | - |
| 20 | react | 19.2.3 | 65+ | 10 hooks | INTEGRATE | Medium |
| 21 | react-day-picker | 9.14.0 | 0 | NONE | **REMOVE** | High |
| 22 | react-dom | 19.2.3 | 0 (implicit) | Framework | KEEP | - |
| 23 | react-hook-form | 7.71.2 | 6 | 7 APIs | INTEGRATE | Medium |
| 24 | recharts | 2.15.4 | 2 | 9 chart elements | INTEGRATE | Medium |
| 25 | resend | 6.9.4 | 1 | 2 APIs | INTEGRATE | Medium |
| 26 | server-only | 0.0.1 | 18 | import side-effect | KEEP | - |
| 27 | shadcn | 4.1.0 | 1 (CSS) | Theme import | KEEP | - |
| 28 | sonner | 2.0.7 | 17 | toast + 3 methods | INTEGRATE | Low |
| 29 | stripe | 20.4.1 | 12 | 10 API methods | INTEGRATE | Medium |
| 30 | tailwind-merge | 3.4.0 | 1 (34 via cn) | twMerge | KEEP | - |
| 31 | tw-animate-css | 1.4.0 | 1 (CSS) | CSS import | KEEP | - |
| 32 | ws | 8.20.0 | 1 | WebSocket class | KEEP | - |
| 33 | zod | 4.3.6 | 5 | 20+ schema APIs | INTEGRATE | Medium |
| 34 | zustand | 5.0.12 | 1 (6 consumers) | create, persist | INTEGRATE | Low |

## Verdict Summary

- **REMOVE (1):** react-day-picker — zero usage, dead dependency
- **KEEP as-is (13):** @hookform/resolvers, @neondatabase/serverless, @radix-ui/react-slot, class-variance-authority, clsx, lucide-react, pg, react-dom, server-only, shadcn, tailwind-merge, tw-animate-css, ws
- **INTEGRATE (20):** @base-ui/react, @calcom/embed-react, @tanstack/react-query, @tanstack/react-table, @vercel/blob, better-auth, date-fns, drizzle-orm, framer-motion, next, next-themes, nuqs, react, react-hook-form, recharts, resend, sonner, stripe, zod, zustand

## Top 5 Highest-Impact Integration Opportunities

1. **drizzle-orm** — Use `db.transaction()` for atomic checkout/payment flows, `count()`/`sum()` helpers for type-safe analytics, `.prepare()` for hot paths
2. **@tanstack/react-query** — Add `HydrationBoundary` for SSR prefetch, `queryOptions()` for type safety, `keepPreviousData` for pagination
3. **better-auth** — Enable email verification + rate limiting (security), add admin `banUser`/`listUsers` APIs
4. **@vercel/blob** — Add `del()` to prevent orphaned files on media delete
5. **framer-motion** — Use `LazyMotion` to cut ~50KB from client bundle while keeping animations
