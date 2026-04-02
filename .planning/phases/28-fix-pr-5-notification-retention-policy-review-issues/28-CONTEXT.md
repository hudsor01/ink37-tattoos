# Phase 28: Fix PR #5 Notification Retention Policy Review Issues - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all security, correctness, robustness, and code quality issues identified in the PR #5 review of the notification retention policy feature. Scope extends to all 3 cron routes for the timing-safe auth fix since they share the identical vulnerability. No new features — this is remediation of existing code before merging PR #5.

</domain>

<decisions>
## Implementation Decisions

### Auth Scope
- **D-01:** Fix all 3 cron routes (balance-due, no-show-followup, notifications-cleanup), not just notifications-cleanup. Extract a shared `verifyCronAuth(request)` utility function that all routes use.

### Utility Placement
- **D-02:** Shared cron utilities (`verifyCronAuth`, `getRedis`) live in `src/lib/security/cron-auth.ts` — alongside the existing `rate-limiter.ts`. Security utilities stay together.

### n8n Workflow Delivery
- **D-03:** Both — create a version-controlled JSON file in the repo (`n8n/notifications-cleanup-workflow.json`) AND deploy it live via n8n MCP tools.

### Test Strategy
- **D-04:** Full coverage. New test file `src/__tests__/api-cron-cleanup.test.ts` with 6-8 tests (auth accept/reject, lock acquire/release/ownership, rowCount, shared client). Extend existing `src/__tests__/env.test.ts` with 3-4 tests for Zod coercion of notification retention env vars.

### Lock TTL
- **D-05:** Keep 300s (5 minutes). Conservative buffer for network latency, cold starts, and audit log writes. Standard for distributed locks.

### Branch Strategy
- **D-06:** Push fix commits directly to the existing `feature/notification-retention-policy` branch. All notification retention work stays in one PR (#5). Reviewers see the complete picture.

### Audit Log Format
- **D-07:** Current metadata format is sufficient (deletedReadCount, deletedUnreadCount, totalDeleted, retentionDays, batchSize). No changes needed.

### Claude's Discretion
- Exact implementation of the Lua release script (inline string vs separate constant)
- Whether `getRedis()` returns a cached singleton or creates fresh instances (research recommends lazy singleton)
- JSDoc wording for the `purgeOldNotifications` auth bypass documentation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Cron Routes (all 3 need timing-safe auth fix)
- `src/app/api/cron/notifications-cleanup/route.ts` — Primary target. Auth, locking, env parsing all modified.
- `src/app/api/cron/balance-due/route.ts` — Same `authHeader !== Bearer ${secret}` vulnerability at line 29.
- `src/app/api/cron/no-show-followup/route.ts` — Same vulnerability at line 37.

### DAL
- `src/lib/dal/notifications.ts` — `purgeOldNotifications()` function. Remove RETURNING clause, add auth bypass docs.

### Env & Security
- `src/lib/env.ts` — Zod env schema. Change string to coerced number for 3 notification vars.
- `src/lib/security/rate-limiter.ts` — Existing Redis usage pattern. New `cron-auth.ts` goes alongside.

### Schema
- `src/lib/db/schema.ts` — `notification` and `auditLog` table definitions.

### Tests
- `src/__tests__/env.test.ts` — Extend with coercion tests.
- `src/__tests__/api-cron-cleanup.test.ts` — New file (Wave 0 gap from research).

### Research
- `.planning/phases/28-fix-pr-5-notification-retention-policy-review-issues/28-RESEARCH.md` — Full research with code examples and pitfall documentation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/security/rate-limiter.ts` — Already uses `new Redis({ url, token })`. Pattern to follow for `getRedis()` helper.
- `src/lib/logger.ts` — Pino structured logging. All cron routes already import and use it.
- `src/lib/env.ts` — Zod env schema with empty-string stripping (lines 40-42). Coercion is safe because empty strings become `undefined`.

### Established Patterns
- `import 'server-only'` in DAL functions — `purgeOldNotifications` is in a server-only module, cron routes don't need it.
- Zod env validation at startup via `env()` singleton — adding coercion follows this pattern.
- Bearer token auth in all 3 cron routes — identical pattern, ripe for shared utility extraction.

### Integration Points
- All 3 cron routes in `src/app/api/cron/*/route.ts` — shared utility imported by all.
- `src/lib/dal/notifications.ts` — purge function called from cron route handler.
- n8n at `n8n.thehudsonfam.com` — existing workflows for balance-due and no-show follow existing JSON pattern.

</code_context>

<specifics>
## Specific Ideas

- The HMAC-then-timingSafeEqual pattern (from research) avoids the RangeError on length mismatch that raw Buffer.from would cause.
- Lua script for lock release is 7 lines — don't use @upstash/lock (v0.2.1 explicitly warns against correctness guarantees).
- n8n workflow should follow the existing balance-due workflow JSON structure for consistency.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-fix-pr-5-notification-retention-policy-review-issues*
*Context gathered: 2026-04-02*
