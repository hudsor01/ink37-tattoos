# Phase 8: Prisma to Drizzle ORM Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 08-prisma-to-drizzle-orm-migration-with-verification-audit-and-cleanup
**Areas discussed:** Migration sequencing, Schema conversion strategy, Verification & rollback, Post-migration cleanup

---

## Migration Sequencing

### Q1: How should the migration be sequenced?

| Option | Description | Selected |
|--------|-------------|----------|
| Single cutover | Convert everything in one phase: schema -> db.ts -> auth -> DAL -> actions -> routes -> tests. Clean break, no dual-ORM. | x |
| Staged cutover | Run Prisma and Drizzle side-by-side temporarily. Migrate DAL files one at a time. | |
| Schema-first, queries later | Convert schema and db.ts first in one plan, then all queries in a second plan. | |

**User's choice:** Single cutover
**Notes:** DAL pattern makes this safe since all 112 queries funnel through one import.

### Q2: How many plans within the phase?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 plans | Plan 1: Schema + connection + auth. Plan 2: All query rewrites. Plan 3: Verification + cleanup. | x |
| 2 plans | Plan 1: Full migration. Plan 2: Verification + cleanup. | |
| 4+ plans | Schema, auth, DAL, actions/routes each get their own plan. | |

**User's choice:** 3 plans
**Notes:** Logical separation with atomic commits per plan.

---

## Schema Conversion Strategy

### Q1: How should the Drizzle schema be generated?

| Option | Description | Selected |
|--------|-------------|----------|
| Introspect from live DB | Run `drizzle-kit introspect` against Neon. Guaranteed to match reality. | x |
| Manual conversion | Hand-translate from Prisma SDL to Drizzle TypeScript. | |
| Hybrid | Introspect base, cross-reference with schema.prisma for relations/enums. | |

**User's choice:** Introspect from live DB
**Notes:** Manual refinement needed for 8 enums, relation helpers, and Decimal mapping.

### Q2: Where should schema and DB client live?

| Option | Description | Selected |
|--------|-------------|----------|
| src/lib/db/ directory | schema.ts + index.ts. Import path stays `@/lib/db`. | x |
| Single file src/lib/db.ts | Keep current pattern. Gets unwieldy with 19 models. | |
| src/db/ top-level | Non-standard for this codebase. | |

**User's choice:** src/lib/db/ directory
**Notes:** Import stays `@/lib/db` so no caller changes needed.

### Q3: Which Drizzle query style?

| Option | Description | Selected |
|--------|-------------|----------|
| Relational queries | db.query.customers.findMany — mirrors Prisma's style closely. | x |
| SQL-like builder only | db.select().from(table).where() for everything. | |
| Mix both | Relational for reads, SQL-like for aggregations. | |

**User's choice:** Relational queries
**Notes:** Falls back to SQL-like builder for analytics aggregations where relational API doesn't cover.

---

## Verification & Rollback

### Q1: How thorough should verification be?

| Option | Description | Selected |
|--------|-------------|----------|
| Build + type-check + existing tests | next build (zero errors) + vitest (3 tests pass) + npm audit (zero high). | x |
| Full test coverage per DAL | Write new tests for all ~50 exported DAL functions. Adds 2+ days. | |
| Integration test against Neon | Run actual queries against Neon branch DB. | |

**User's choice:** Build + type-check + existing tests
**Notes:** TypeScript catches most issues at build time since Drizzle is fully typed.

### Q2: Keep Prisma as rollback option?

| Option | Description | Selected |
|--------|-------------|----------|
| No rollback — burn the boats | Delete Prisma entirely once Drizzle passes verification. Git is the rollback. | x |
| Keep deps for 1 week | Leave unused but installed as safety net. | |
| Neon branch for testing | Test migration against a branch DB first. | |

**User's choice:** No rollback — burn the boats
**Notes:** Phase is atomic — fully done or fully reverted via git revert.

---

## Post-migration Cleanup

### Q1: What should cleanup cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Full audit sweep | Delete all Prisma artifacts, grep for zero references, update CLAUDE.md + PROJECT.md, npm audit clean, final build pass. | x |
| Minimal cleanup | Delete files and deps, verify build. Skip docs. | |
| Cleanup + .planning docs | Everything above plus update REQUIREMENTS.md, ROADMAP.md, prior CONTEXT.md files. | |

**User's choice:** Full audit sweep
**Notes:** npm audit zero high/critical is the hard success criterion.

---

## Claude's Discretion

- Drizzle relation helper naming
- Whether to split schema.ts into multiple domain files
- drizzle-kit config structure
- Test mock adaptation
- Transaction pattern migration
- Analytics aggregation query rewrites

## Deferred Ideas

None — discussion stayed within phase scope.
