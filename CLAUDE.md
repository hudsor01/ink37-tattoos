# Ink37 Tattoos

Unified tattoo studio platform — public site, admin dashboard, client portal, online store — single Next.js 16 app.

## Commands

```bash
bun run dev          # Dev server (Turbopack)
bun run build        # Production build
bun run typecheck    # TypeScript check
bun run lint         # Biome lint
bun test             # Unit + integration tests
bun run test:e2e     # Playwright E2E
```

**Always use `bun`** — not npm/yarn/pnpm.

## Architecture

- Single app with route groups: `(public)`, `(auth)`, `(dashboard)`, `(portal)`, `(store)`
- Data Access Layer (DAL) pattern — auth checks in server-only DB functions
- Server Actions for mutations, Route Handlers for webhooks only
- Drizzle ORM with neon-serverless driver, schema in `src/lib/db/schema.ts`
- Better Auth with 5-tier RBAC (USER, STAFF, MANAGER, ADMIN, SUPER_ADMIN)

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Drizzle ORM, Neon PostgreSQL, Better Auth, Stripe, Resend, Cal.com embed, Vercel Blob, Vercel hosting

## Key Patterns

- Import db from `@/lib/db`, schema from `@/lib/db/schema`
- Better Auth uses raw `pg.Pool` (not Drizzle adapter)
- Drizzle `numeric()` returns strings — monetary columns use `mode:'number'`
- Drizzle mutations need explicit `.returning()`
- Drizzle relational API (`db.query`) doesn't support aggregations — use SQL builder

## Planning

All planning artifacts (phases, roadmap, requirements) are in `.planning/`.

## Conventions

Follow existing patterns found in the codebase. See `.planning/PROJECT.md` for full project context.
