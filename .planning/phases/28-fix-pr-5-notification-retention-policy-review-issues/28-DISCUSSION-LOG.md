# Phase 28: Fix PR #5 Notification Retention Policy Review Issues - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 28-fix-pr-5-notification-retention-policy-review-issues
**Areas discussed:** Auth scope, Utility placement, n8n delivery, Test strategy, Lock TTL, Branch strategy, Audit log format

---

## Auth Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fix all 3 routes | Extract shared verifyCronAuth() utility, apply to all cron routes. ~15 extra lines, eliminates the vulnerability class entirely. | ✓ |
| Fix only notifications-cleanup | Stay within PR #5 scope. Other two routes are a separate concern. | |

**User's choice:** Fix all 3 routes
**Notes:** All 3 cron routes (balance-due, no-show-followup, notifications-cleanup) have the identical `authHeader !== Bearer ${secret}` vulnerability.

---

## Utility Placement

| Option | Description | Selected |
|--------|-------------|----------|
| src/lib/security/cron-auth.ts | Alongside existing rate-limiter.ts — security utilities stay together. | ✓ |
| src/lib/cron/utils.ts | New cron-specific module. Separates cron concerns from general security. | |
| Inline in each route | No shared module. Copy the pattern into each route file. | |

**User's choice:** src/lib/security/cron-auth.ts
**Notes:** None

---

## n8n Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| JSON file in repo | Create n8n/notifications-cleanup-workflow.json for manual import. Keeps workflow versioned in git. | |
| Configure via n8n MCP tools | Use the n8n MCP server to create the workflow directly on n8n.thehudsonfam.com. | |
| Both — JSON file + deploy via MCP | Version-controlled JSON in repo AND deploy it live. Best of both worlds. | ✓ |

**User's choice:** Both — JSON file + deploy via MCP
**Notes:** None

---

## Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Full coverage | New test file with 6-8 tests + 3-4 env coercion tests. Matches project's existing test rigor. | ✓ |
| Minimal — happy path only | 3-4 tests covering the critical security fixes only. | |
| Claude decides | Let Claude determine appropriate test coverage based on risk level. | |

**User's choice:** Full coverage
**Notes:** None

---

## Lock TTL

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 300s | Conservative buffer for network latency, cold starts, and audit log writes. Standard. | ✓ |
| Reduce to 60s | Tighter window. Risk: aggressive for cold starts. | |
| Make configurable via env | Add NOTIFICATION_CLEANUP_LOCK_TTL env var. More flexible but adds complexity. | |

**User's choice:** Keep 300s
**Notes:** None

---

## Branch Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Push to existing branch | Amend PR #5 with fix commits. All notification retention work in one PR. | ✓ |
| New branch off feature branch | Separate PR for review fixes. | |
| New branch off main | Independent branch. Would need cherry-pick/rebase after PR #5 merges. | |

**User's choice:** Push to existing branch
**Notes:** None

---

## Audit Log Format

| Option | Description | Selected |
|--------|-------------|----------|
| Current format is fine | Existing metadata captures all operationally relevant info. No changes needed. | ✓ |
| Add execution duration | Track how long the cleanup took. Useful for monitoring performance over time. | |
| Add oldest deleted notification date | Include the createdAt of the oldest notification that was purged. | |

**User's choice:** Current format is fine
**Notes:** None

---

## Claude's Discretion

- Lua release script structure (inline vs constant)
- getRedis() caching strategy (lazy singleton recommended by research)
- JSDoc wording for purgeOldNotifications auth bypass

## Deferred Ideas

None — discussion stayed within phase scope
