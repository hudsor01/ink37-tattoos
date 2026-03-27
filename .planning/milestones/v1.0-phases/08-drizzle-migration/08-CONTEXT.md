# Phase 8: Prisma to Drizzle ORM Migration with Verification Audit and Cleanup - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Prisma ORM with Drizzle ORM across the entire codebase — schema, connection, DAL, auth adapter, server actions, API routes, and tests. Verify all existing functionality still works via build + type-check + existing test suite. Clean up all Prisma artifacts and update project documentation. The database (Neon PostgreSQL) stays unchanged — only the ORM layer is swapped.

</domain>

<decisions>
## Implementation Decisions

### Migration Sequencing
- **D-01:** Single cutover — convert everything in one phase with no dual-ORM period. The existing DAL pattern (all 112 queries funnel through `src/lib/db.ts`) makes this safe.
- **D-02:** Split into 3 plans: Plan 1 (schema + connection + auth adapter), Plan 2 (all DAL/actions/routes query rewrites), Plan 3 (verification audit + cleanup + npm audit).
- **D-03:** Migration order within plans: Drizzle schema -> db client -> auth adapter -> 16 DAL files -> 2 action files -> 3 API routes -> 3 test files -> delete Prisma artifacts.

### Schema Conversion Strategy
- **D-04:** Introspect from live Neon database using `drizzle-kit introspect` to auto-generate TypeScript schema. Guaranteed to match production reality.
- **D-05:** Manual refinement needed after introspect: 8 pgEnum definitions, Drizzle relation helpers (one-to-many, one-to-one), Decimal -> numeric() type mapping.
- **D-06:** Schema and DB client live in `src/lib/db/` directory — `schema.ts` for tables/enums/relations, `index.ts` for drizzle() client export. Import path stays `@/lib/db` (no caller changes needed).
- **D-07:** Use Drizzle relational query API (`db.query.customers.findMany`) as primary query style — mirrors Prisma's findMany/findUnique/include/select patterns closely. Fall back to SQL-like builder (`db.select().from()`) for aggregations and complex analytics queries.

### Verification & Rollback
- **D-08:** Verification = `next build` (zero errors) + `npm run test` (existing 3 test files pass) + `npm audit` (zero high/critical). TypeScript catches wrong column names, missing relations, incorrect return types, and enum mismatches at build time.
- **D-09:** No rollback mechanism — burn the boats. Git history is the rollback. Phase is atomic: either fully done or fully reverted via `git revert`. No dual-ORM maintenance burden.

### Post-migration Cleanup
- **D-10:** Full audit sweep: delete `prisma/`, `src/generated/prisma/`, remove all `@prisma/*` deps, grep for zero remaining prisma references in `src/`.
- **D-11:** Update `package.json` scripts (`db:generate` -> `db:push`, `db:migrate` -> Drizzle equivalent).
- **D-12:** Update `CLAUDE.md` tech stack section and `PROJECT.md` key decisions table to reflect Drizzle.
- **D-13:** Final `npm audit` must show zero high/critical vulnerabilities (the entire reason for this migration).
- **D-14:** Final `npm run build` must pass clean.

### Claude's Discretion
- Exact Drizzle relation helper naming conventions
- Whether to split schema.ts into multiple files per domain (auth models, domain models, store models) or keep as single file
- drizzle-kit config file structure
- Test mock adaptation approach
- How to handle Prisma's `$transaction` -> Drizzle's `db.transaction()`
- Analytics DAL aggregation query rewrites (groupBy, sum, count patterns)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Prisma Surface (what's being replaced)
- `prisma/schema.prisma` -- 19 models, 8 enums, 532 lines. The source of truth for the data model.
- `src/lib/db.ts` -- PrismaClient + PrismaPg adapter with pg.Pool. Single replacement point.
- `src/lib/auth.ts` -- Better Auth with `prismaAdapter(db, ...)` + 4 Prisma queries in databaseHooks.

### DAL Layer (bulk of the query rewrites)
- `src/lib/dal/index.ts` -- Barrel export of all 16 DAL modules.
- `src/lib/dal/customers.ts` -- Representative DAL file showing findMany/findUnique/create/update/delete/search patterns with requireStaffRole auth checks.
- `src/lib/dal/analytics.ts` -- Most complex queries (aggregations, groupBy, date ranges).
- `src/lib/dal/portal.ts` -- Highest query count (11), uses requirePortalAuth pattern.

### Server Actions & API Routes
- `src/lib/actions/store-actions.ts` -- Store checkout with transaction.
- `src/lib/actions/portal-actions.ts` -- Portal mutations.
- `src/app/api/webhooks/stripe/route.ts` -- Most complex Prisma usage (11 queries, transactions, batch updates).

### Better Auth Adapter
- Better Auth Drizzle adapter docs: `better-auth/adapters/drizzle` -- feature parity with Prisma adapter.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts`: Single centralized DB client — only one file to swap for connection setup.
- `src/lib/dal/index.ts`: Barrel export means all callers import from `@/lib/dal`, not individual DAL files. No caller changes needed.
- 3 existing test files in `src/__tests__/` — update mocks but preserve test logic.

### Established Patterns
- **DAL auth pattern**: `requireStaffRole()` / `requireAdminRole()` / `requirePortalAuth()` wraps every query. Must be preserved exactly.
- **Server-only imports**: Every DAL file starts with `import 'server-only'`. Must continue.
- **React cache**: DAL read functions use `cache()` wrapper. Must continue.
- **Error handling in actions**: Return `{success, error?}` not throw. Must continue.
- **Decimal fields**: TattooSession and Payment models use Prisma's Decimal type — needs careful mapping to Drizzle's `numeric()`.

### Integration Points
- `@/lib/db` import — used by 23 files. The import path must not change.
- `@/generated/prisma/client` — used for type imports (e.g., `Prisma` namespace in audit.ts). Must be replaced with Drizzle schema type exports.
- `better-auth/adapters/prisma` -> `better-auth/adapters/drizzle` — one-line swap in auth.ts config.
- `package.json` scripts: `db:generate`, `db:push`, `db:migrate` need updating.

</code_context>

<specifics>
## Specific Ideas

- The migration exists because Prisma 7 bundles Hono (a web framework) as a transitive dependency, creating an unresolvable stream of CVEs. 5 months and 7+ GitHub issues with no fix from Prisma team.
- Drizzle was chosen over Kysely specifically because Better Auth has a Drizzle adapter at feature parity.
- The Neon database stays — only the ORM client layer changes. Zero schema migrations needed at the database level.
- `npm audit` with zero high/critical is the hard success criterion — it's the entire motivation for the phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-prisma-to-drizzle-orm-migration-with-verification-audit-and-cleanup*
*Context gathered: 2026-03-23*
