# Ink37 Tattoos

Unified tattoo studio platform — public site, admin dashboard, client portal, online store — single Next.js 16 app.

## Commands

```bash
bun run dev          # Dev server (Turbopack)
bun run build
bun run lint         # ESLint
bun run test         # Vitest + MSW — no Playwright E2E suite
bun run db:push      # Drizzle (also: db:pull, db:generate, db:migrate, db:studio, db:seed)
bunx tsc --noEmit    # Typecheck — there is no `typecheck` script
```

**Always use `bun`** — not npm/yarn/pnpm.

## Architecture

- Single app with route groups: `(public)`, `(auth)`, `(dashboard)`, `(portal)`, `(store)`
- DAL pattern in `src/lib/dal/` — server-only DB functions enforce auth/role checks (see `appointments.ts` for the canonical `requireStaffRole` shape)
- Server Actions for mutations, wrapped in `safeAction` (`src/lib/actions/safe-action.ts`) for consistent Zod-error/exception handling; route handlers in `src/app/api/` include webhooks (Stripe, Cal.com, Resend), Better Auth (`[...all]`), cron jobs, uploads, admin APIs, and health checks
- Drizzle ORM with `neon-serverless` driver; schema in `src/lib/db/schema.ts`, client in `src/lib/db/index.ts`
- Better Auth (`src/lib/auth.ts`) with 5-tier RBAC stored as lowercase strings on `user.role`: `user`, `staff`, `manager`, `admin`, `super_admin`

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, Drizzle ORM, Neon Postgres, Better Auth, Stripe, Resend, Cal.com embed, Vercel Blob, Upstash Redis (rate limit), Sentry, Zustand, TanStack Query, nuqs (URL state), Framer Motion, react-hook-form, Zod, pino, Vitest + MSW. Deployed on Vercel.

## Key Patterns

- Import db from `@/lib/db`, schema from `@/lib/db/schema`
- Better Auth uses a raw `Pool` from `@neondatabase/serverless` (not the Drizzle adapter)
- Drizzle `numeric()` returns strings — monetary columns use `mode: 'number'`
- Drizzle mutations need explicit `.returning()`
- Drizzle relational API (`db.query`) doesn't support aggregations — use the SQL builder (`db.select`)
- AuthGuard pattern: every protected segment layout (`src/app/(dashboard)/layout.tsx`, `src/app/(portal)/layout.tsx`) calls `requireAuthSession({ routeTag, fallbackPath })` from `src/lib/auth-guard.ts`. The helper handles session lookup, framework-signal pass-through (`isFrameworkSignal()` re-throws anything with a string `digest` property — `HANGING_PROMISE_REJECTION`, `NEXT_REDIRECT`, `NEXT_NOT_FOUND`, `NEXT_HTTP_ERROR_FALLBACK`), Sentry-tagged error logging (`handled_via: 'authguard_fallback'`), and the `safeCallbackUrl`-filtered redirect through `/login?callbackUrl=...`. Layout-specific role checks happen after the helper returns. **Never** trust a `callbackUrl` from a query param or header without going through `safeCallbackUrl()` (`src/lib/safe-callback.ts`) — it filters open-redirect (`//evil.com`), absolute-URL (`https://`, `javascript:`, `data:`), and login-loop vectors.
- Every protected segment also ships its own `unauthorized.tsx` (see `src/app/(dashboard)/unauthorized.tsx`, `src/app/(portal)/unauthorized.tsx`) that redirects to `/login` with the same `safeCallbackUrl(headers().get('x-pathname'), fallbackPath)` pattern. The root `src/app/unauthorized.tsx` renders a static "Sign in" CTA and is the wrong UX for app-segment visitors — segment-local boundaries override it.
- Route handlers' **outer** catch blocks must re-throw on `isFrameworkSignal(error)` (see `src/app/api/admin/calendar/route.ts`) — otherwise `redirect()`, `notFound()`, `unauthorized()`, and `forbidden()` thrown deeper in the call chain get silently 500'd. Same rule applies to server-action catches outside `safeAction` and to any DAL-wrapping helper. **Inner catches** that wrap a call which never enters auth-checked DAL (e.g., the non-blocking `createNotificationForAdmins(...)` calls inside the Stripe/Cal webhook handlers, the per-iteration `sendBalanceDueReminder` / `sendNoShowFollowUp` loops in cron jobs) are intentionally narrow swallows and don't need the re-throw — but if you add a new DAL call inside one, audit it.
- The dark theme is forced via `forcedTheme="dark"` on the next-themes ThemeProvider in `src/components/providers.tsx`. There is no theme toggle anywhere; do not add one without removing the forcedTheme prop or the toggle will silently no-op.

## Planning

All planning artifacts in `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, MILESTONES.md, STATE.md).

## Conventions

Follow existing patterns in the codebase. See `.planning/PROJECT.md` for full project context.
