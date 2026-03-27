# Milestones

## v1.0 MVP (Shipped: 2026-03-27)

**Phases completed:** 11 phases, 37 plans, 73 tasks

**Key accomplishments:**

- Next.js 16 project with Prisma 7 unified schema (12 models, UUID IDs), Zod 4 env validation, Tailwind CSS 4, and 5 passing tests
- Better Auth with admin plugin RBAC, Data Access Layer with server-only auth boundary on all protected queries, proxy.ts for route redirects
- 5 route groups with placeholder pages, Shadcn Button/Card/Input components, TanStack Query + Zustand providers wrapping root layout
- Rate Limiter
- PublicNav
- Gallery Page
- 1. [Rule 1 - Bug] Fixed test mock isolation in contact-form.test.ts
- Admin sidebar navigation with shadcn Sidebar, reusable DataTable with TanStack Table sorting/filtering/pagination, complete DAL coverage for all admin entities with RBAC, Server Actions with Zod validation and fire-and-forget audit logging
- API Routes:
- Payment and StripeEvent Prisma models with server-only Stripe client, currency helpers, env validation, and Zod payment schemas
- Portal DAL with requirePortalAuth customer scoping, consent/profile server actions with Zod 4 validation, and Better Auth login/registration pages
- 4-page client portal with overview dashboard, appointment history, tattoo session viewer with inline consent signing, and payment history with Stripe receipt links
- 6 vitest suites (51 tests) covering gift card generation, Zod store schemas, Zustand cart store, checkout validation, order status transitions, and download token business rules
- Prisma schema with 5 store models (Product, Order, OrderItem, GiftCard, DownloadToken), Zustand cart store with localStorage persistence, Zod validation schemas, and gift card code generator
- Product/order/gift-card DAL with Stripe sync, store checkout action, webhook branching on orderType, and gift card redemption wired into tattoo deposit/balance flow (D-09)
- Complete store customer-facing UI with product catalog, cart drawer, gift card purchase, checkout flow, and secure digital download route.
- Admin dashboard pages for product CRUD (list, create, edit, soft-delete with DataTable) and order management (list with KPI cards, detail view with status actions, cancel/refund confirmation dialogs)
- Admin sign-out changed from insecure GET link to Better Auth signOut() POST action; payment success page now links to portal payment history
- Fixed order email download URLs to use per-item /api/store/download?token=TOKEN format, added stripePriceId null guard, and wired gift card purchaser confirmation email
- Drizzle ORM 0.45.1 installed with 19-table schema, neon-serverless db client, and Better Auth converted to raw pg.Pool with Drizzle query hooks
- All 82 Prisma queries across 21 files rewritten to Drizzle ORM with zero type errors in modified files, 3 interactive transactions, and preserved auth/cache/server-only patterns
- Zero Prisma artifacts remaining, npm audit clean (0 high/critical CVEs), all 18 test files pass (145 tests), tsc clean, CLAUDE.md and PROJECT.md updated for Drizzle ORM
- Full audit of 33 runtime deps with nuqs URL state provider, DataTable column visibility/row selection, and better-auth plugin evaluation
- Staggered gallery animations via framer-motion variants and formatDistance relative timestamps across 5 dashboard/portal list views
- Commit:
- One-liner:
- 29 unit/integration tests covering all 5 email functions, 2 Stripe SDK wrappers, and Resend webhook with Svix HMAC verification using mocked external dependencies

---
