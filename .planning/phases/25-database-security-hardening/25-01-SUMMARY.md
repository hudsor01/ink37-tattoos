---
phase: 25-database-security-hardening
plan: 01
subsystem: database
tags: [drizzle, migrations, seed, neon, postgresql]

# Dependency graph
requires:
  - phase: 08-drizzle-migration
    provides: Drizzle ORM schema with 23 tables in src/lib/db/schema.ts
provides:
  - Single consolidated Drizzle migration (0000_adorable_master_mold.sql) covering all 23 tables
  - Idempotent production seed script with artist, settings, and consent form
  - db:seed package.json script for production bootstrap
  - Unique constraint on consent_form.version for upsert support
affects: [27-documentation, 25-02, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [idempotent-seed-upsert, pool-connection-cleanup, migration-consolidation]

key-files:
  created:
    - drizzle/0000_adorable_master_mold.sql
    - src/lib/db/seed.ts
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json
    - drizzle/meta/0000_snapshot.json
    - package.json

key-decisions:
  - "Pool-based connection for seed script with explicit pool.end() in finally block"
  - "Seed script creates its own Drizzle instance (cannot import from index.ts due to server-only)"
  - "Production baseline comment in migration SQL for existing database safety"

patterns-established:
  - "Seed upsert pattern: onConflictDoUpdate with unique columns as targets"
  - "Standalone script pattern: create own Pool + drizzle instance, set neonConfig.webSocketConstructor"

requirements-completed: [DB-01, DB-02]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 25 Plan 01: Migration Consolidation + Seed Script Summary

**Consolidated 2 Drizzle migrations into single 23-table baseline with idempotent seed script using Pool-based connection cleanup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T04:37:26Z
- **Completed:** 2026-03-31T04:41:01Z
- **Tasks:** 2
- **Files modified:** 7 (1 created, 4 modified, 3 deleted)

## Accomplishments
- Consolidated 2 existing migrations + 1 stale SQL file into single migration covering all 23 tables, 8 enums, and all indexes
- Added unique constraint on consent_form.version enabling idempotent upserts
- Created production seed script with artist profile, 11 settings across 5 categories, and full legal consent form
- Seed script uses Pool with explicit connection teardown preventing WebSocket process hangs

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate migrations, add consent_form unique constraint, and clean up stale SQL** - `ce0182a` (feat)
2. **Task 2: Create idempotent production seed script with proper connection cleanup** - `777a35c` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added .unique() to consent_form.version column
- `drizzle/0000_adorable_master_mold.sql` - Single consolidated migration with 23 tables, production baseline comment
- `drizzle/meta/_journal.json` - Reset to single entry (idx: 0)
- `drizzle/meta/0000_snapshot.json` - Fresh snapshot matching consolidated migration
- `src/lib/db/seed.ts` - Idempotent seed script with Pool, upsert pattern, connection cleanup
- `package.json` - Added db:seed script
- `drizzle/0000_dry_human_torch.sql` - Deleted (replaced by consolidated migration)
- `drizzle/0001_lively_whirlwind.sql` - Deleted (replaced by consolidated migration)
- `drizzle/meta/0001_snapshot.json` - Deleted (replaced by consolidated snapshot)
- `src/lib/db/migrations/add-product-images-and-order-tracking.sql` - Deleted (dead code, already in schema.ts)

## Decisions Made
- Used Pool from @neondatabase/serverless instead of connection string shorthand to enable explicit pool.end() in finally block -- prevents WebSocket from keeping the process alive indefinitely
- Seed script creates its own Drizzle instance rather than importing from @/lib/db/index.ts, because index.ts has `import 'server-only'` which only works in Next.js server components
- Added PRODUCTION BASELINE comment at top of migration SQL to document the manual baseline approach for deploying to existing databases
- Kept db:migrate and db:seed as separate commands (no db:reset composite)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing merge conflict markers in worktree files (8+ route files with `<<<<<<< HEAD` markers) cause test failures. These are NOT related to this plan's changes and are from the parallel agent worktree state. Out of scope per deviation rules.

## Known Stubs

None - all data in seed script is production-ready (artist is placeholder but documented as such for admin dashboard update).

## User Setup Required

None - no external service configuration required. Seed script uses existing DATABASE_URL environment variable.

## Next Phase Readiness
- Migration consolidation complete, ready for production deployment
- Seed script ready for first-launch bootstrap
- DEPLOYMENT.md (Phase 27) should document the migration baseline procedure referenced in the SQL comment
- Phase 25 Plan 02 (CSP nonces + admin rate limiting) has no dependency on this plan

## Self-Check: PASSED

All created files exist, all commits found in git log, all deleted files confirmed removed.

---
*Phase: 25-database-security-hardening*
*Completed: 2026-03-31*
