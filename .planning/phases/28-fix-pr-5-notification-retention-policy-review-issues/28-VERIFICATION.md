---
phase: 28-fix-pr-5-notification-retention-policy-review-issues
verified: 2026-04-02T17:49:30Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "n8n workflow runs on schedule"
    expected: "Workflow fires at 3AM CT daily, POSTs to ink37tattoos.com/api/cron/notifications-cleanup with Ink37 Cron Auth credential"
    why_human: "External system (n8n.thehudsonfam.com) — cannot verify live execution programmatically without network access"
---

# Phase 28: Fix PR #5 Notification Retention Policy Review Issues — Verification Report

**Phase Goal:** All security, correctness, robustness, and code quality issues identified in the PR #5 review are resolved before merge
**Verified:** 2026-04-02T17:49:30Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | verifyCronAuth rejects bad tokens and accepts valid tokens using timing-safe comparison | VERIFIED | `cron-auth.ts`: HMAC-then-timingSafeEqual via `crypto.createHmac` + `crypto.timingSafeEqual`; 3 auth tests pass green |
| 2 | getRedis returns a shared Redis client singleton (not new instances per call) | VERIFIED | `cron-auth.ts` line 72: `let _redis: Redis | null | undefined` module-level; `new Redis()` appears exactly once (line 91) |
| 3 | Non-numeric env vars for notification retention fields fail at Zod parse time, not silently produce NaN | VERIFIED | `env.ts` lines 27-29: `z.coerce.number().int().positive().optional()` on all 3 fields; 5 coercion tests pass green |
| 4 | n8n workflow JSON exists with correct schedule, endpoint URL, and auth configuration | VERIFIED | `n8n/notifications-cleanup-workflow.json` exists; triggerAtHour=3, url=`https://ink37tattoos.com/api/cron/notifications-cleanup`, credential="Ink37 Cron Auth" |
| 5 | All 3 cron routes use verifyCronAuth from shared utility (no inline string === comparison) | VERIFIED | All 3 routes import and call `verifyCronAuth`; grep for `authHeader !== \`Bearer` returns 0 matches |
| 6 | notifications-cleanup route stores a unique UUID in the Redis lock and releases only if the UUID matches | VERIFIED | `crypto.randomUUID()` used as lock value; `redis.eval(RELEASE_SCRIPT, [LOCK_KEY], [owner])` with Lua `KEYS[1]/ARGV[1]` atomic check-and-delete |
| 7 | purgeOldNotifications SQL queries do not use RETURNING clause — rowCount provides the count | VERIFIED | `notifications.ts`: grep for RETURNING returns 0 matches; `deletedReadResult.rowCount` used directly |
| 8 | purgeOldNotifications has a prominent JSDoc comment documenting intentional auth bypass for cron use | VERIFIED | `notifications.ts` line 105: `@cron-authorized This function intentionally does NOT call requireStaffRole()` |
| 9 | notifications-cleanup route uses getRedis() singleton, not new Redis() per function call | VERIFIED | Route imports `getRedis` from cron-auth; `new Redis` does not appear in route file |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/security/cron-auth.ts` | Shared timing-safe cron auth + Redis singleton | VERIFIED | Exports `verifyCronAuth`, `getRedis`, `LOCK_KEY`, `LOCK_TTL_SECONDS`; 93 lines, substantive |
| `src/lib/env.ts` | Zod coerced number fields for notification retention | VERIFIED | All 3 notification fields use `z.coerce.number().int().positive().optional()` |
| `src/__tests__/env.test.ts` | Tests for notification retention Zod coercion | VERIFIED | `describe('notification retention env coercion')` block with 5 tests (numeric, undefined, non-numeric, negative, zero); all pass |
| `n8n/notifications-cleanup-workflow.json` | n8n workflow for daily notification cleanup | VERIFIED | Contains `notifications-cleanup` in URL, `triggerAtHour: 3`, `"Ink37 Cron Auth"` credential reference |
| `src/app/api/cron/notifications-cleanup/route.ts` | Cron route with timing-safe auth, owner-checked lock, and coerced env values | VERIFIED | Imports `verifyCronAuth`, `getRedis` from cron-auth; uses `crypto.randomUUID()` for lock; Lua eval release; env() coerced numbers |
| `src/app/api/cron/balance-due/route.ts` | Cron route with timing-safe auth via shared utility | VERIFIED | Imports and calls `verifyCronAuth`; no inline Bearer comparison |
| `src/app/api/cron/no-show-followup/route.ts` | Cron route with timing-safe auth via shared utility | VERIFIED | Imports and calls `verifyCronAuth`; no inline Bearer comparison |
| `src/lib/dal/notifications.ts` | purgeOldNotifications without RETURNING, with auth bypass JSDoc | VERIFIED | No RETURNING in DELETE queries; `@cron-authorized` JSDoc present |
| `src/__tests__/api-cron-cleanup.test.ts` | Tests for cron route auth, locking, rowCount usage, and shared Redis client | VERIFIED | 8 tests across 4 describe blocks: cron auth, distributed lock, purge behavior, shared Redis client; all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cron-auth.ts` | `node:crypto` | `createHmac` + `timingSafeEqual` | WIRED | `import crypto from 'node:crypto'`; both functions called in `timingSafeCompare` |
| `cron-auth.ts` | `@upstash/redis` | lazy singleton `new Redis({ url, token })` | WIRED | `new Redis` called exactly once (line 91) inside `getRedis()` singleton guard |
| `env.ts` | `zod` | `z.coerce.number()` for 3 notification env vars | WIRED | Lines 27-29 confirmed |
| `notifications-cleanup/route.ts` | `cron-auth.ts` | `import { verifyCronAuth, getRedis }` | WIRED | Line 7-11 confirmed; both called in handler |
| `balance-due/route.ts` | `cron-auth.ts` | `import { verifyCronAuth }` | WIRED | Line 7 confirmed; called in POST handler |
| `no-show-followup/route.ts` | `cron-auth.ts` | `import { verifyCronAuth }` | WIRED | Line 9 confirmed; called in POST handler |
| `notifications.ts` DAL | `drizzle-orm` | `db.execute(sql...)` without RETURNING | WIRED | Lines 131-150: both DELETE queries use `db.execute(sql...)` with no RETURNING; rowCount read at lines 152-153 |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase modifies security/utility modules and a DAL purge function, not UI components or dashboard pages that render dynamic data.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 16 targeted tests pass (auth, lock, env coercion) | `bun run test -- src/__tests__/api-cron-cleanup.test.ts src/__tests__/env.test.ts` | 16/16 passed, 0 failed, 313ms | PASS |
| verifyCronAuth rejects non-Bearer input | grep `timingSafeCompare` in cron-auth.ts | Found on line 57 | PASS |
| No inline string === comparison remains in any cron route | grep `authHeader !== \`Bearer` | 0 matches | PASS |
| No RETURNING in purge DELETE queries | grep RETURNING notifications.ts | 0 matches | PASS |
| new Redis() not called per function in cleanup route | grep `new Redis` notifications-cleanup/route.ts | 0 matches | PASS |
| Lua KEYS[1]/ARGV[1] pattern present | grep in notifications-cleanup/route.ts | Lines 19-20 | PASS |

---

### Requirements Coverage

These requirement IDs are phase-local (defined in `28-RESEARCH.md` phase requirements section; they do not appear in `.planning/REQUIREMENTS.md` which covers the broader project v2.0 requirements). All 8 phase-local IDs are satisfied.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CRON-SEC-01 | 28-01, 28-02 | Bearer token uses crypto.timingSafeEqual instead of === | SATISFIED | `cron-auth.ts`: HMAC-then-timingSafeEqual; all 3 routes use `verifyCronAuth` |
| CRON-SEC-02 | 28-02 | Redis lock stores unique value, release checks value matches | SATISFIED | `randomUUID()` as lock value; Lua `KEYS[1]/ARGV[1]` atomic release |
| CRON-ROB-01 | 28-01, 28-02 | Non-numeric env vars caught at startup via Zod coercion | SATISFIED | `z.coerce.number().int().positive().optional()` on all 3 fields; 5 tests green |
| CRON-ROB-02 | 28-02 | Purge SQL does not use RETURNING clause | SATISFIED | 0 RETURNING matches in notifications.ts; rowCount used |
| CRON-ROB-03 | 28-02 | purgeOldNotifications documents its intentional bypass of requireStaffRole | SATISFIED | `@cron-authorized` JSDoc at line 104-109 of notifications.ts |
| CRON-CLEAN-01 | 28-01, 28-02 | Redis client shared between tryAcquireLock and releaseLock | SATISFIED | Both functions call `getRedis()` singleton; no inline `new Redis()` in route |
| CRON-CLEAN-02 | 28-01 | Env schema uses z.coerce.number() for all three notification env vars | SATISFIED | Lines 27-29 of env.ts confirmed |
| CRON-INFRA-01 | 28-01 | n8n workflow configured for notifications-cleanup endpoint | SATISFIED | `n8n/notifications-cleanup-workflow.json` exists with correct schedule, URL, credential |

**Orphaned requirements check:** `grep "Phase 28"` in `.planning/REQUIREMENTS.md` returns no matches. CRON-* IDs are phase-local and fully covered by the two plans.

---

### Anti-Patterns Found

None. Grep for TODO/FIXME/HACK/PLACEHOLDER across all 9 modified/created files returned 0 matches.

---

### Human Verification Required

#### 1. n8n Live Workflow Execution

**Test:** Import `n8n/notifications-cleanup-workflow.json` to n8n.thehudsonfam.com. Verify:
- Schedule trigger fires at 3AM CT
- HTTP POST reaches `https://ink37tattoos.com/api/cron/notifications-cleanup`
- Ink37 Cron Auth header credential is attached
- Response is 200 with `{ deletedReadCount, deletedUnreadCount, totalDeleted }`

**Expected:** Workflow executes successfully; execution history shows green run at scheduled time
**Why human:** External system — programmatic verification requires live n8n access and waiting for scheduled execution

---

### Gaps Summary

No gaps. All 9 observable truths verified, all 9 artifacts pass all three levels (exists, substantive, wired), all key links confirmed, all 8 phase requirements satisfied, 16/16 tests pass, 0 anti-patterns found.

The sole human verification item (n8n live execution) is infrastructure deployment validation, not a code correctness gap — the JSON artifact is fully correct and deployable.

---

_Verified: 2026-04-02T17:49:30Z_
_Verifier: Claude (gsd-verifier)_
