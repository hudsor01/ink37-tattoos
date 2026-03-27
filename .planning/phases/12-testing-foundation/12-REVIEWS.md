---
phase: 12
reviewers: [claude]
reviewed_at: 2026-03-27T07:30:00.000Z
plans_reviewed: [12-01-PLAN.md, 12-02-PLAN.md, 12-03-PLAN.md]
---

# Cross-AI Plan Review — Phase 12

## Claude Review

A well-structured plan that correctly identifies all 5 email functions, 2 Stripe SDK functions, and the webhook handler. The interface documentation matches the actual source code. The Svix HMAC computation helper in the webhook tests is a particularly strong design choice — computing a reference signature in-test rather than hardcoding values ensures the tests validate actual cryptographic behavior.

### Plan 12-01: Email Service + Stripe SDK + Resend Webhook

**Risk: LOW**

**Strengths:**
- Correctly identifies that `sendContactNotification` checks `ADMIN_EMAIL` before `RESEND_API_KEY` (both early-return paths covered)
- Webhook test correctly notes the route uses `process.env.RESEND_WEBHOOK_SECRET` directly (not `env()`)
- Follows established project patterns (dynamic imports after mocks, vi.hoisted for shared mocks)
- Good edge case coverage: multiple signatures in header, whsec_ prefix stripping, invalid JSON

**Concerns:**
- **MEDIUM**: `env()` mock shape — resend.ts calls `env()` as a function, but existing webhook-stripe.test.ts mocks `env` as a plain object. Plan should explicitly show: `vi.mock('@/lib/env', () => ({ env: () => ({ RESEND_API_KEY: 'test-key', ADMIN_EMAIL: 'admin@test.com' }) }))`
- **LOW**: process.env cleanup — Task 2 sets `process.env.RESEND_WEBHOOK_SECRET` in beforeEach but doesn't specify afterEach cleanup
- **LOW**: `getResend()` instantiation — mock must intercept the Resend constructor to return the mock client

**Suggestions:**
- Add exact `env()` mock signature in action block
- Add `afterEach(() => { delete process.env.RESEND_WEBHOOK_SECRET })` to webhook test setup
- Test `batchResult?.data?.[0]?.id` truthiness check (mock returning `{ data: null, error: null }`)

### Plan 12-02: Server Actions + Upload Endpoint

**Risk: MEDIUM**

**Strengths:**
- Correctly identifies the `throw` vs `{success, error}` pattern distinction
- Portal action tests cover 6 distinct `signConsentAction` failure branches
- Upload endpoint strategy (capture callback, invoke directly) avoids mocking Vercel internals
- Plans to mock `after()` from `next/server` to execute audit callbacks synchronously

**Concerns:**
- **MEDIUM**: Mock depth for portal actions — chained `.set().where()` mock must return a thenable
- **MEDIUM**: `'use server'` directive not `'server-only'` — the `vi.mock('server-only')` is harmless but misleading
- **MEDIUM**: Missing `updateCustomerAction` test — source exports it but plan skips it
- **LOW**: FormData construction for portal tests — `formData.set('acknowledged', 'true')` must be string not boolean

**Suggestions:**
- Add at least one `updateCustomerAction` test (auth guard + validated update + revalidatePath)
- Explicitly document the `.set().where()` mock chain returning a resolved promise
- Test `onUploadCompleted` callback doesn't throw
- Test `deleteCustomerAction` calls `revalidatePath('/dashboard/customers')`

### Plan 12-03: DAL Logic + Auth Hooks

**Risk: HIGH**

**Strengths:**
- Correctly identifies module-level prepared statement challenge and proposes mock chain
- `react.cache` passthrough mock is the right approach
- Auth hooks replication matches existing `stripe-helpers.test.ts` pattern
- Source-file content assertion to detect drift
- Testing `redirect` by making it throw is correct Next.js pattern

**Concerns:**
- **HIGH**: Prepared statement mock complexity — 4 prepared statements at module import time need `db.select()` to return right chain shape before any test runs
- **HIGH**: Auth hook replication drift risk — if someone modifies auth.ts, tests pass against old logic. Source-content assertion partially mitigates but is brittle
- **MEDIUM**: `checkSchedulingConflict` requires staff role — mock must return `{ user: { role: 'staff' } }` before scheduling logic executes
- **MEDIUM**: date-fns partial mocking — must use `vi.importActual('date-fns')` to keep `isWithinInterval` real
- **LOW**: `getRevenueData` mock data must return `Date` objects, not strings

**Suggestions:**
- Provide explicit prepared-statement mock factory helper in plan
- Consider dynamic-import-with-full-mocking approach for auth hooks as primary strategy
- Use hash/checksum for source-content assertion instead of string matching
- Explicitly specify `getCurrentSession` mock return shape for DAL tests

---

## Consensus Summary

### Agreed Strengths
- Follows established codebase testing patterns (vi.hoisted, dynamic imports, reference mock templates)
- Correct identification of the two error-handling paradigms (throw for admin, {success,error} for portal)
- All 7 requirements covered with no gaps
- Good test isolation (beforeEach cleanup, resetModules, dynamic imports)
- Plans create only new files — zero risk of merge conflicts

### Agreed Concerns
1. **Mock shape correctness** is the #1 risk — Drizzle chainable builders, prepared statements, and `env()` function vs object
2. **Plan 12-03 prepared statements** are the hardest mock setup in the entire phase
3. **Auth hook replication drift** needs mitigation (content assertion + structural matching)
4. **Missing `updateCustomerAction` test** — easy gap to close
5. **process.env cleanup** in webhook tests to prevent leakage

### Divergent Views
None — single reviewer.
