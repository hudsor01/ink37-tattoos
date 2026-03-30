# Phase 22: Testing and Tech Debt - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand automated test coverage to validate all features built in Phases 13-21. Add server action unit tests, API route integration tests, E2E tests for critical flows, RBAC tests, webhook tests with malformed payloads, and rate limiter tests. Verify and close remaining tech debt items. This is the final phase of v2.0.

</domain>

<decisions>
## Implementation Decisions

### All Testing & Debt
- **D-01:** Claude decides everything — test patterns, coverage priorities, file organization, mock strategies. 30 test files already exist with 378 passing tests. Phase 12 established vitest + MSW patterns.

### Test Requirements
- **TEST-01:** Server action unit tests — success, auth rejection, validation failure with mocked DAL
- **TEST-02:** API route integration tests — auth enforcement, input validation, correct error status codes
- **TEST-03:** E2E test scenarios — guest checkout, tattoo session payment, portal consent, admin CRUD
- **TEST-04:** RBAC tests — USER can't access admin, STAFF can't do ADMIN-only, unauthenticated rejected
- **TEST-05:** Webhook handlers — malformed payloads, missing fields, concurrent duplicates
- **TEST-06:** Rate limiter — concurrent load conditions

### Tech Debt
- **DEBT-01:** Replace asChild prop usage — CHECK: may already be done (0 occurrences found in codebase)
- **DEBT-02:** Contacts DAL consumed by PAGE-04 — DONE in Phase 16
- **DEBT-03:** Audit log Shadcn Select — DONE in Phase 19
- **DEBT-04:** Session form Shadcn Form wrapper — CHECK: may already be resolved

### Claude's Discretion
- Test file organization (per-feature vs per-type)
- Mock strategy (MSW for HTTP, vi.mock for DAL)
- E2E test approach (vitest + testing-library, or Playwright/Cypress)
- Which debt items need work vs which are already resolved
- Test coverage depth per feature area
- Whether to add coverage reporting

</decisions>

<canonical_refs>
## Canonical References

### Existing Tests
- `src/__tests__/` — 30 test files, 378 passing tests
- `vitest.config.ts` — Test configuration
- `src/__tests__/server-actions.test.ts` — Existing server action test patterns
- `src/__tests__/rbac.test.ts` — Existing RBAC test patterns
- `src/__tests__/webhook-stripe.test.ts` — Existing webhook test patterns
- `src/__tests__/rate-limiter.test.ts` — Existing rate limiter tests

### Server Actions (TEST-01)
- `src/lib/actions/*.ts` — All 13+ server action files

### API Routes (TEST-02)
- `src/app/api/**/*.ts` — All API routes (admin, upload, webhooks, cron, receipts, invoices, calendar, notifications, analytics export)

### Auth (TEST-04)
- `src/lib/auth.ts` — requireRole(), getCurrentSession()
- `src/lib/dal/*.ts` — requireStaffRole() in DAL functions

### Webhooks (TEST-05)
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/cal/route.ts`
- `src/app/api/webhooks/resend/route.ts`

### Rate Limiter (TEST-06)
- `src/lib/security/rate-limiter.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- vitest + MSW test infrastructure from Phase 12
- 30 existing test files with established mock patterns
- vi.mock for module mocking, MSW for HTTP boundary tests
- ActionResult<T> type makes action testing consistent

### What Needs Creating
- Server action tests for new Phase 13-21 actions (consent, invoice, design approval, notification, gift card admin, etc.)
- API route integration tests for cron routes, receipt/invoice routes, calendar route, analytics export
- E2E test scenarios for critical business flows
- RBAC tests for new role-gated endpoints
- Webhook tests with malformed/concurrent payloads
- Rate limiter concurrent load tests
- Verification of debt item status

</code_context>

<specifics>
## Specific Ideas

- Focus on testing the new features from Phases 13-21 — existing Phase 12 tests cover v1.0 features
- ActionResult<T> makes action testing uniform — every action returns { success, data?, error?, fieldErrors? }
- n8n cron routes need auth tests (Bearer token validation)
- Stirling PDF routes need error handling tests (service down, malformed HTML)

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase

</deferred>

---

*Phase: 22-testing-and-tech-debt*
*Context gathered: 2026-03-30*
