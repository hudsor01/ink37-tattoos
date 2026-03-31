# Phase 27: Documentation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a production deployment runbook (DEPLOYMENT.md) and project README. No code changes -- pure documentation capturing the final state of the v3.0 Production Launch milestone.

</domain>

<decisions>
## Implementation Decisions

### DEPLOYMENT.md
- **D-01:** Vercel-only deployment target. No local staging instructions needed.
- **D-02:** Must cover: env var setup (reference docs/ENV_VARS.md), database migration baseline procedure (Drizzle journal marking from Phase 25), DNS cutover, smoke tests, and rollback procedures.
- **D-03:** Database migration baseline uses manual journal entry approach (documented in Phase 25 consolidated migration header comment).

### README.md
- **D-04:** Audience is solo developer (Richard). Concise, assumes familiarity with the stack.
- **D-05:** Focus on 'how to get running locally' and links to operational docs (DEPLOYMENT.md, ENV_VARS.md, n8n/README.md).
- **D-06:** Include project overview, tech stack summary, local dev setup, and architecture references.

### Claude's Discretion
- Exact section structure and depth for both documents
- Whether to include architecture diagrams (mermaid) or just text descriptions
- Smoke test checklist items for DEPLOYMENT.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Documentation
- `docs/ENV_VARS.md` -- All 19 env vars documented (created in Phase 26)
- `n8n/README.md` -- n8n workflow import and setup instructions (created in Phase 26)

### Deployment Context
- `drizzle/0000_adorable_master_mold.sql` -- Consolidated migration with PRODUCTION BASELINE comment (Phase 25)
- `drizzle/meta/_journal.json` -- Migration journal (single entry, for baseline procedure)
- `src/lib/db/seed.ts` -- Production seed script (Phase 25)
- `package.json` -- Scripts section (db:migrate, db:seed, build, dev)
- `next.config.ts` -- Build config and security headers
- `src/proxy.ts` -- CSP nonce generation and auth redirects

### Project Structure
- `src/app/` -- Next.js 16 App Router structure with route groups
- `src/lib/db/schema.ts` -- Drizzle schema (23 tables)
- `src/lib/auth.ts` -- Better Auth configuration
- `.planning/PROJECT.md` -- Project overview and history

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/ENV_VARS.md` -- deployment doc can reference directly instead of duplicating env var list
- `n8n/README.md` -- deployment doc can link to for cron workflow setup
- Phase 25 migration comment -- contains the exact baseline SQL command for production

### Established Patterns
- Route groups: (public), (auth), (dashboard), (portal), (store)
- DAL pattern for data access with auth checks
- Server Actions for mutations, Route Handlers for webhooks only

### Integration Points
- No code integration needed -- this is pure documentation

</code_context>

<specifics>
## Specific Ideas

- DEPLOYMENT.md should reference docs/ENV_VARS.md for env var details rather than duplicating
- README should link to DEPLOYMENT.md, ENV_VARS.md, and n8n/README.md
- Deployment runbook should include the exact Drizzle baseline SQL from Phase 25 migration header

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 27-documentation*
*Context gathered: 2026-03-31*
