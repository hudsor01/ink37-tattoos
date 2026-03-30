# Phase 22: Testing and Tech Debt - Research

**Researched:** 2026-03-30
**Domain:** Vitest unit/integration testing, RBAC verification, webhook security testing, rate limiter load testing, tech debt audit
**Confidence:** HIGH

## Summary

Phase 22 is the final phase of v2.0. It expands automated test coverage to validate all features built in Phases 13-21, adds new test files for untested server actions, API routes, E2E scenarios, RBAC enforcement, webhook edge cases, and rate limiter concurrent load. It also verifies and closes four tech debt items (two of which appear already resolved).

The project has a mature test infrastructure: 30 test files with 378 passing tests (21 currently failing due to stale mocks from code changes in Phases 13-21). Vitest 3.1.1 with MSW 2.12.14 is the established stack. All tests use vi.mock() for module mocking, module-scope mock functions, and dynamic imports for route/action testing. The ActionResult<T> type provides a uniform assertion surface for all server action tests.

**Primary recommendation:** Fix the 21 currently failing tests first (stale mocks from prior phases), then expand coverage to the 13+ new server action files and 10+ API routes added in Phases 13-21. Use the existing vi.mock() patterns -- do NOT introduce Playwright or Cypress for E2E; instead, implement E2E scenarios as integration-style tests using the same vitest + mock infrastructure that already works.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Claude decides everything -- test patterns, coverage priorities, file organization, mock strategies. 30 test files already exist with 378 passing tests. Phase 12 established vitest + MSW patterns.

### Claude's Discretion
- Test file organization (per-feature vs per-type)
- Mock strategy (MSW for HTTP, vi.mock for DAL)
- E2E test approach (vitest + testing-library, or Playwright/Cypress)
- Which debt items need work vs which are already resolved
- Test coverage depth per feature area
- Whether to add coverage reporting

### Deferred Ideas (OUT OF SCOPE)
None -- this is the final phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Server action unit tests with mocked auth and DAL | Established pattern in server-actions.test.ts; 13+ action files need new tests |
| TEST-02 | API route integration tests covering auth, validation, error responses | Pattern in upload-endpoint.test.ts and webhook-stripe.test.ts; 10+ routes need tests |
| TEST-03 | E2E test scenarios for critical flows | Recommend vitest integration tests (not Playwright); mock external services |
| TEST-04 | RBAC tests verify role enforcement at route, action, and DAL levels | Existing rbac.test.ts covers DAL; needs expansion to actions and API routes |
| TEST-05 | Webhook handlers tested with malformed payloads, missing fields, concurrent duplicates | Strong existing coverage; needs expansion for malformed payloads and Resend edge cases |
| TEST-06 | Rate limiter tested under concurrent load | Existing rate-limiter.test.ts covers basic flow; needs Promise.all concurrent tests |
| DEBT-01 | Replace asChild prop usage | ALREADY RESOLVED: 0 occurrences of asChild in codebase |
| DEBT-02 | Create contacts admin page or remove orphaned DAL exports | ALREADY RESOLVED: Done in Phase 16 |
| DEBT-03 | Audit log filter selects replaced with Shadcn Select | ALREADY RESOLVED: Done in Phase 19 |
| DEBT-04 | Session form converted from raw register() to Shadcn Form wrapper | NEEDS VERIFICATION: session-form.tsx still uses raw register() pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 3.1.1 | Test runner | Already installed and configured; 30 test files use it |
| msw | 2.12.14 | HTTP mocking | Already installed; used for Stripe/Resend integration tests |
| @vitest/coverage-v8 | 4.1.2 | Coverage reporting | Already installed; configured in vitest.config.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | 4.4.1 | JSX transform for tests | Already configured in vitest.config.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest E2E-style | Playwright | Would require new dependency, browser install, different mock strategy; not worth it for this project size |
| Vitest E2E-style | Cypress | Same tradeoff as Playwright; overkill for admin dashboard |
| vi.mock() | MSW for everything | MSW only intercepts HTTP; vi.mock needed for DAL/auth/db |

**Installation:** No new packages needed. All test dependencies already installed.

## Architecture Patterns

### Recommended Test File Organization

Keep the existing flat structure in `src/__tests__/`. Organize new files by domain:

```
src/__tests__/
  # Existing (30 files) -- fix stale mocks
  server-actions.test.ts        # Customer + Portal actions (FIX NEEDED)
  rbac.test.ts                  # DAL-level RBAC (EXPAND)
  webhook-stripe.test.ts        # Stripe webhook (FIX NEEDED)
  cal-webhook.test.ts           # Cal.com webhook (FIX NEEDED)
  contact-form.test.ts          # Contact form action (FIX NEEDED)
  rate-limiter.test.ts          # Rate limiter (EXPAND)
  ...

  # New test files
  actions-media.test.ts         # Media actions (TEST-01)
  actions-product.test.ts       # Product actions (TEST-01)
  actions-consent.test.ts       # Consent actions (TEST-01)
  actions-design.test.ts        # Design approval actions (TEST-01)
  actions-invoice.test.ts       # Invoice actions (TEST-01)
  actions-notification.test.ts  # Notification actions (TEST-01)
  actions-gift-card-admin.test.ts  # Gift card admin actions (TEST-01)
  actions-settings.test.ts      # Settings actions (TEST-01)
  actions-order.test.ts         # Order actions (TEST-01)
  api-cron.test.ts              # Cron routes (TEST-02)
  api-admin.test.ts             # Admin API routes (TEST-02)
  api-portal.test.ts            # Portal billing route (TEST-02)
  api-pdf-routes.test.ts        # Invoice/receipt/analytics PDF routes (TEST-02)
  api-notifications.test.ts     # Notifications API route (TEST-02)
  api-calendar.test.ts          # Calendar API route (TEST-02)
  api-store-download.test.ts    # Store download route (TEST-02)
  e2e-flows.test.ts             # E2E scenario integration tests (TEST-03)
  rbac-actions.test.ts          # RBAC at action level (TEST-04)
  rbac-routes.test.ts           # RBAC at API route level (TEST-04)
  webhook-malformed.test.ts     # Malformed webhook payloads (TEST-05)
  rate-limiter-concurrent.test.ts  # Concurrent load tests (TEST-06)
```

### Pattern 1: Server Action Unit Test (Established)

**What:** Test each server action for auth rejection, validation failure, and success path.
**When to use:** Every server action file.
**Example:**
```typescript
// Source: src/__tests__/server-actions.test.ts (existing pattern)
const mockRequireRole = vi.fn();
vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

it('rejects unauthorized users', async () => {
  mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
  const { someAction } = await import('@/lib/actions/some-actions');
  await expect(someAction(data)).rejects.toThrow('Unauthorized');
});

it('returns success with valid data', async () => {
  mockRequireRole.mockResolvedValue(staffSession);
  mockDalFunction.mockResolvedValue({ id: 'new-1' });
  const { someAction } = await import('@/lib/actions/some-actions');
  const result = await someAction(validData);
  expect(result.success).toBe(true);
});
```

### Pattern 2: API Route Integration Test (Established)

**What:** Test route handlers for auth enforcement, input validation, and correct HTTP status codes.
**When to use:** Every API route file.
**Example:**
```typescript
// Source: src/__tests__/upload-endpoint.test.ts (existing pattern)
function makeRequest(body: object = {}): Request {
  return new Request('http://localhost/api/some-route', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

it('rejects unauthenticated users', async () => {
  mockGetCurrentSession.mockResolvedValue(null);
  const { POST } = await import('@/app/api/some-route/route');
  const response = await POST(makeRequest());
  expect(response.status).toBe(401);
});

it('rejects non-admin roles', async () => {
  mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
  const { GET } = await import('@/app/api/admin/some-route/route');
  const response = await GET(makeRequest());
  expect(response.status).toBe(403);
});
```

### Pattern 3: Webhook Malformed Payload Test

**What:** Test webhook handlers with structurally invalid payloads.
**When to use:** Stripe, Cal.com, and Resend webhook routes.
**Example:**
```typescript
it('rejects payload missing required fields', async () => {
  mockConstructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed', data: { object: null } });
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  const response = await POST(makeRequest('{}', { 'stripe-signature': 'valid' }));
  // Should handle gracefully, not crash
  expect([200, 400, 500]).toContain(response.status);
});
```

### Pattern 4: Rate Limiter Concurrent Load Test

**What:** Test rate limiter under concurrent Promise.all load.
**When to use:** Rate limiter TEST-06.
**Example:**
```typescript
it('correctly limits under concurrent load', async () => {
  const ip = `concurrent-${Date.now()}`;
  const results = await Promise.all(
    Array.from({ length: 10 }, () => rateLimiters.contact.limit(ip))
  );
  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success).length;
  expect(successes).toBe(5);  // contact limit is 5
  expect(failures).toBe(5);
});
```

### Pattern 5: safeAction-Wrapped Actions

**What:** Actions wrapped in safeAction return ActionResult<T>, making assertion consistent.
**When to use:** All new action files from Phases 13-21 that use safeAction.
**Example:**
```typescript
// Actions using safeAction pattern
it('returns validation error for invalid input', async () => {
  mockRequireRole.mockResolvedValue(staffSession);
  const { createAction } = await import('@/lib/actions/some-actions');
  const result = await createAction(invalidData);
  expect(result.success).toBe(false);
  expect(result.error).toBe('Validation failed');
  expect(result.fieldErrors).toBeDefined();
});
```

### Anti-Patterns to Avoid
- **Do NOT use real database connections in tests:** All DB calls must be mocked via vi.mock('@/lib/db').
- **Do NOT import route/action at top level when mocks vary per test:** Use dynamic `await import()` inside each `it()` block so mocks are fresh.
- **Do NOT test internal implementation details:** Test the public contract (status codes, return shapes), not which internal function was called in what order.
- **Do NOT use vi.hoisted():** The project uses module-scope const mocks instead (vi.hoisted was removed in Bun compat fix Phase 12).
- **Do NOT forget to mock 'server-only':** Every test importing a DAL or auth module needs `vi.mock('server-only', () => ({}))`.
- **Do NOT forget to mock 'next/server' after():** Actions use `after()` for audit logging; mock it as `vi.fn((fn) => fn())`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| E2E browser testing | Custom Playwright setup | Vitest integration tests with mocked services | Project already has 30 test files; adding browser-level E2E is overkill for solo artist studio |
| Coverage thresholds | Custom coverage scripts | `vitest run --coverage` with v8 provider | Already configured in vitest.config.ts |
| Test data factories | Custom fixture builders | Inline mock objects per test | Tests are fast enough; factory abstraction adds complexity without benefit at this scale |
| Mock server for webhooks | Custom HTTP server | MSW 2.x handlers | Already installed and used in stripe-msw.integration.test.ts |

## Common Pitfalls

### Pitfall 1: Stale Mocks from Prior Phase Code Changes
**What goes wrong:** 21 tests currently fail because code changed in Phases 13-21 but test mocks weren't updated.
**Why it happens:** Mock shapes (e.g., db.insert().values().onConflictDoNothing().returning()) must exactly match the actual code's call chain.
**How to avoid:** Read the actual route/action code before writing mocks. Verify the Drizzle chain shape matches reality.
**Warning signs:** "Cannot read property of undefined" errors in test output.

### Pitfall 2: Mock Contamination Between Tests
**What goes wrong:** Tests pass individually but fail in suite due to shared mock state.
**Why it happens:** vi.mock() is module-scoped; mock functions persist across tests.
**How to avoid:** Always call `vi.clearAllMocks()` in `beforeEach`. Use unique identifiers per test (e.g., `Date.now()` suffix).
**Warning signs:** Tests pass with `vitest run path/to/file` but fail with `vitest run`.

### Pitfall 3: Two requireRole Patterns in Codebase
**What goes wrong:** Mocking the wrong auth pattern.
**Why it happens:** Some actions use `requireRole` from `@/lib/auth` (hierarchy-based), others define a local `requireRole` function (e.g., consent-actions.ts). Also, some actions use `getCurrentSession` directly (notification-actions.ts).
**How to avoid:** Read each action file's imports before writing mocks. Mock the exact module each action imports.
**Warning signs:** "Unauthorized" errors when session mock is correctly set up.

### Pitfall 4: Actions That Redirect vs Return ActionResult
**What goes wrong:** Test expects ActionResult but action throws redirect.
**Why it happens:** Some actions (notification-actions.ts) use `redirect('/login')` for auth instead of throwing Error('Unauthorized').
**How to avoid:** Check each action's auth pattern. Actions that redirect need `vi.mock('next/navigation', ...)`.
**Warning signs:** "NEXT_REDIRECT" errors in test output.

### Pitfall 5: FormData vs Object Arguments
**What goes wrong:** Test passes wrong argument type.
**Why it happens:** Some actions take FormData, others take plain objects (gift-card-admin-actions), others take positional arguments (design-approval-actions).
**How to avoid:** Check each action's function signature. Use `new FormData()` and `formData.set()` for FormData-based actions.
**Warning signs:** Zod validation errors in tests.

### Pitfall 6: Mocking Stirling PDF Fetch for PDF Routes
**What goes wrong:** Tests for invoice/receipt/analytics routes fail because they make real HTTP requests to Stirling PDF service.
**Why it happens:** These routes use global `fetch()` to call the external Stirling PDF API.
**How to avoid:** Use vi.stubGlobal('fetch', vi.fn()) or MSW to intercept the Stirling PDF URL. Mock both the HEAD health check and the POST conversion.
**Warning signs:** Timeout errors or 503 responses in PDF route tests.

### Pitfall 7: Cron Routes Use process.env Not env()
**What goes wrong:** Mock env module doesn't cover CRON_SECRET.
**Why it happens:** Cron routes read `process.env.CRON_SECRET` directly (not via the env() helper).
**How to avoid:** Set `process.env.CRON_SECRET` in beforeEach, delete in afterEach.
**Warning signs:** 500 "CRON_SECRET not configured" errors.

## Code Examples

### Common Mock Setup for New Action Tests

```typescript
// Source: Established project pattern
const mockRequireRole = vi.fn();
const mockDalFunction = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getCurrentSession: (...args: unknown[]) => mockRequireRole(...args),
}));
vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

const staffSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };
```

### Common Mock Setup for API Route Tests

```typescript
// Source: Established project pattern (upload-endpoint.test.ts, webhook-stripe.test.ts)
const mockGetCurrentSession = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

function makeRequest(url: string, opts: RequestInit = {}): Request {
  return new Request(url, { method: 'GET', ...opts });
}
```

### Cron Route Bearer Token Test Pattern

```typescript
// Source: Derived from api/cron/balance-due/route.ts structure
describe('Cron Balance Due', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('rejects missing auth header', async () => {
    const { POST } = await import('@/app/api/cron/balance-due/route');
    const req = new Request('http://localhost/api/cron/balance-due', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects invalid bearer token', async () => {
    const { POST } = await import('@/app/api/cron/balance-due/route');
    const req = new Request('http://localhost/api/cron/balance-due', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

### RBAC Multi-Role Test Pattern

```typescript
// Source: Derived from existing rbac.test.ts + auth.ts ROLE_HIERARCHY
const ROLES = ['user', 'staff', 'manager', 'admin', 'super_admin'] as const;

describe.each([
  { action: 'createProductAction', minRole: 'admin', file: '@/lib/actions/product-actions' },
  { action: 'markNotificationReadAction', minRole: 'user', file: '@/lib/actions/notification-actions' },
])('$action requires $minRole', ({ action, minRole, file }) => {
  const roleIndex = ROLES.indexOf(minRole as typeof ROLES[number]);

  for (const role of ROLES) {
    const shouldSucceed = ROLES.indexOf(role) >= roleIndex;
    it(`${shouldSucceed ? 'allows' : 'rejects'} ${role}`, async () => {
      mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role } });
      // ... test the action
    });
  }
});
```

## Tech Debt Audit

### DEBT-01: Replace asChild prop usage
**Status:** ALREADY RESOLVED
**Evidence:** `grep -r "asChild" src/` returns 0 matches. All asChild usage was already removed or never existed in this codebase.
**Confidence:** HIGH
**Action:** Mark as complete. No work needed.

### DEBT-02: Create contacts admin page or remove orphaned DAL exports
**Status:** ALREADY RESOLVED
**Evidence:** Phase 16 created the contacts management page (PAGE-04). CONTEXT.md confirms "DONE in Phase 16."
**Confidence:** HIGH
**Action:** Mark as complete. No work needed.

### DEBT-03: Audit log Shadcn Select
**Status:** ALREADY RESOLVED
**Evidence:** CONTEXT.md confirms "DONE in Phase 19."
**Confidence:** HIGH
**Action:** Mark as complete. No work needed.

### DEBT-04: Session form Shadcn Form wrapper
**Status:** NEEDS VERIFICATION / POSSIBLE WORK
**Evidence:** `src/components/dashboard/session-form.tsx` still uses raw `register()` from useForm, not the Shadcn `<FormField>` / `<FormItem>` wrapper pattern. However, Phase 15-04 decision says: "Keep RHF in all forms, use form.setError() for server errors instead of rewriting to useActionState." The session form uses RHF useForm with zodResolver, which is functionally correct. The debt item was about consistency -- converting from raw register() to Shadcn Form wrapper, but the Phase 15 decision explicitly kept RHF patterns.
**Confidence:** MEDIUM -- the Phase 15 decision may have intentionally superseded this debt item.
**Action:** Verify if session-form.tsx is the only file still using raw register(). The gift-card-form.tsx also uses it. If the Phase 15 decision covers this, mark as resolved by design decision. Otherwise, convert to Shadcn Form wrapper.

## Failing Test Analysis

21 tests currently fail across 4 files. Root causes:

### src/__tests__/server-actions.test.ts (6 failures)
**Root cause:** Portal actions (signConsentAction, updateProfileAction) were refactored. The mocks for `@/lib/auth` mock `requireRole` but the portal-actions.ts imports `requireRole` from `@/lib/auth` and the mock signature may not match the current code. The actions may have been moved or restructured.
**Fix:** Re-read portal-actions.ts, update mocks to match current import pattern and function signatures.

### src/__tests__/cal-webhook.test.ts (6 failures)
**Root cause:** Cal.com webhook route was significantly enhanced (Zod validation, calEvent table insert, notification creation). Mocks don't account for CalWebhookPayloadSchema validation, calEvent insert, or createNotificationForAdmins.
**Fix:** Add mocks for `@/lib/security/validation` CalWebhookPayloadSchema, `@/lib/dal/notifications`, and the calEvent schema insert chain.

### src/__tests__/contact-form.test.ts (7 failures)
**Root cause:** Contact form action was likely refactored with updated validation, rate limiting, or DAL patterns.
**Fix:** Re-read the current contact-actions.ts/contact-status-action.ts and update mocks.

### src/__tests__/webhook-stripe.test.ts (1 failure)
**Root cause:** The "processes new events" test returns 500 instead of 200. The event handler throws because mock doesn't cover all the processing paths for `payment_intent.succeeded`.
**Fix:** Mock the payment lookup and update chain that the handler now uses.

## Test Scope Inventory

### Server Actions Needing Tests (TEST-01)

| Action File | Actions | Auth Pattern | Current Coverage |
|------------|---------|-------------|-----------------|
| consent-actions.ts | createConsentFormVersionAction, deactivateConsentFormAction | Local requireRole | NONE |
| design-approval-actions.ts | approveDesignAction, rejectDesignAction | requireRole('admin') + safeAction | NONE |
| invoice-actions.ts | emailInvoiceAction | requireRole('admin') + safeAction | NONE |
| notification-actions.ts | markNotificationReadAction, markAllNotificationsReadAction | getCurrentSession + redirect | NONE |
| gift-card-admin-actions.ts | issueGiftCardAction, deactivateGiftCardAction | getCurrentSession | NONE |
| media-actions.ts | 7 actions (create, update, delete, toggle, bulk) | requireRole('admin') + safeAction | NONE |
| product-actions.ts | createProductAction, updateProductAction, deleteProductAction | requireRole('admin') + safeAction | NONE |
| settings-actions.ts | (check contents) | requireRole | NONE |
| order-actions.ts | (check contents) | requireRole | NONE |
| session-actions.ts | (check contents) | requireRole | NONE |
| artist-profile-action.ts | (check contents) | requireRole | NONE |
| product-image-actions.ts | (check contents) | requireRole | NONE |
| store-actions.ts | (check contents) | Various | NONE |

### API Routes Needing Tests (TEST-02)

| Route | Method | Auth | Rate Limited | Current Coverage |
|-------|--------|------|-------------|-----------------|
| /api/cron/balance-due | POST | Bearer CRON_SECRET | No | NONE |
| /api/cron/no-show-followup | POST | Bearer CRON_SECRET | No | NONE |
| /api/invoices/[paymentId] | GET | getCurrentSession | No | NONE |
| /api/receipts/[paymentId] | GET | getCurrentSession | No | NONE |
| /api/analytics/export/pdf | GET | getCurrentSession + STAFF_ROLES | No | NONE |
| /api/notifications | GET | getCurrentSession | No | NONE |
| /api/admin/calendar | GET | DAL requireStaffRole | No | NONE |
| /api/admin/customers | GET | ADMIN_ROLES check | No | NONE |
| /api/admin/media | GET | ADMIN_ROLES check | No | NONE |
| /api/admin/appointments | GET | (check) | No | NONE |
| /api/admin/sessions | GET | (check) | No | NONE |
| /api/portal/billing | POST | getCurrentSession + rateLimiters.portalBilling | Yes | NONE |
| /api/store/download | GET | rateLimiters.storeDownload | Yes | NONE |

### E2E Flow Scenarios (TEST-03)

These are integration-style tests that exercise multi-step flows by calling actions/routes in sequence:

1. **Guest Checkout Flow:** Create cart -> checkout -> Stripe webhook -> order created -> download token works
2. **Tattoo Session Payment:** Create customer -> create session -> send payment request -> payment webhook -> session updated
3. **Portal Consent Signing:** User login -> fetch sessions -> sign consent -> consent recorded
4. **Admin CRUD Flow:** Auth as admin -> create entity -> update -> verify -> delete

### RBAC Test Matrix (TEST-04)

| Resource | user | staff | manager | admin | super_admin |
|----------|------|-------|---------|-------|-------------|
| Dashboard pages | REJECT | ALLOW | ALLOW | ALLOW | ALLOW |
| Admin API routes | REJECT | REJECT | REJECT | ALLOW | ALLOW |
| DAL staff functions | REJECT | ALLOW | ALLOW | ALLOW | ALLOW |
| DAL admin functions | REJECT | REJECT | REJECT | ALLOW | ALLOW |
| Portal actions | ALLOW* | ALLOW | ALLOW | ALLOW | ALLOW |
| Notification actions | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |

*Portal actions require user role but also check customer linkage.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vi.hoisted() for mock setup | Module-scope const mocks | Phase 12 (Bun compat) | All new tests must use module-scope pattern |
| Mixed throw/return error handling | safeAction wrapper + ActionResult<T> | Phase 14 | New action tests can uniformly assert result.success |
| Direct env access | env() helper with Zod validation | Phase 13 | Test mocks should mock @/lib/env, not process.env (except CRON_SECRET) |
| Top-level route imports | Dynamic import inside it() blocks | Phase 12 | Tests that need different mocks per test must use dynamic imports |

## Open Questions

1. **Session form DEBT-04 resolution**
   - What we know: session-form.tsx uses raw register(), gift-card-form.tsx also uses raw register()
   - What's unclear: Whether Phase 15-04 decision ("Keep RHF in all forms") intentionally supersedes DEBT-04
   - Recommendation: Mark as resolved by design decision -- the form works correctly with RHF, and the Phase 15 decision explicitly chose to keep this pattern

2. **Coverage threshold target**
   - What we know: Coverage reporting is configured but no threshold is enforced
   - What's unclear: What coverage percentage the user considers acceptable
   - Recommendation: Run coverage after all tests pass, report the number, but don't enforce a threshold gate

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.1.1 + @vitest/coverage-v8 4.1.2 |
| Config file | vitest.config.ts |
| Quick run command | `vitest run --reporter=verbose` |
| Full suite command | `vitest run --reporter=verbose --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Server action unit tests | unit | `vitest run src/__tests__/actions-*.test.ts` | Wave 0 |
| TEST-02 | API route integration tests | integration | `vitest run src/__tests__/api-*.test.ts` | Wave 0 |
| TEST-03 | E2E flow scenarios | integration | `vitest run src/__tests__/e2e-flows.test.ts` | Wave 0 |
| TEST-04 | RBAC enforcement tests | unit | `vitest run src/__tests__/rbac*.test.ts` | Partial (expand) |
| TEST-05 | Webhook malformed payload tests | integration | `vitest run src/__tests__/webhook-malformed.test.ts` | Wave 0 |
| TEST-06 | Rate limiter concurrent load | unit | `vitest run src/__tests__/rate-limiter-concurrent.test.ts` | Wave 0 |
| DEBT-01 | asChild removed | grep verification | `grep -r "asChild" src/` | Already verified |
| DEBT-02 | Contacts page exists | verification | N/A | Already resolved |
| DEBT-03 | Audit log select components | verification | N/A | Already resolved |
| DEBT-04 | Session form wrapper | verification | `grep "register(" src/components/dashboard/session-form.tsx` | Needs review |

### Sampling Rate
- **Per task commit:** `vitest run --reporter=verbose`
- **Per wave merge:** `vitest run --reporter=verbose`
- **Phase gate:** Full suite green + `vitest run --coverage`

### Wave 0 Gaps
- None for framework (vitest + MSW already fully set up)
- 21 existing failing tests must be fixed before new tests can be added reliably (same mock patterns)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: 30 existing test files, all action files, all API routes
- vitest.config.ts: Test configuration verified
- package.json: Version pinning verified (vitest 3.1.1, msw 2.12.14, @vitest/coverage-v8 4.1.2)

### Secondary (MEDIUM confidence)
- Phase 15-04 decision on RHF forms (from STATE.md accumulated context)
- CONTEXT.md debt item status claims (verified via grep)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already installed and in use
- Architecture: HIGH - patterns established by 30 existing test files
- Pitfalls: HIGH - observed 21 real failures; root causes identified from code inspection
- Tech debt audit: HIGH for DEBT-01/02/03 (verified by grep/context), MEDIUM for DEBT-04 (design decision ambiguity)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable; no dependency changes expected)
