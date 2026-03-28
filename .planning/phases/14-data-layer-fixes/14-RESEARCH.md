# Phase 14: Data Layer Fixes - Research

**Researched:** 2026-03-28
**Domain:** Drizzle ORM (DAL patterns, pagination, full-text search), Next.js (server actions, revalidation), Zod 4 (error handling)
**Confidence:** HIGH

## Summary

Phase 14 is a data layer remediation phase touching 16 DAL files, 13 server action files, and 3 webhook route handlers. The core work falls into five categories: (1) adding pagination and full-text search to all list DAL functions, (2) standardizing all server action returns to `ActionResult<T>`, (3) wiring `revalidatePath` into webhook handlers, (4) creating missing DAL functions and wiring orphaned ones, and (5) adding FK validation before inserts.

The existing codebase has a consistent DAL pattern (auth check, Drizzle query, return result) and a consistent action pattern (`requireRole` -> Zod parse -> DAL call -> audit -> revalidate -> return). The main issue is that list functions return all rows without pagination, actions throw errors instead of returning structured results, and webhooks mutate data without triggering cache revalidation.

**Primary recommendation:** Build shared types (`PaginationParams`, `PaginatedResult<T>`, `ActionResult<T>`) and a `safeAction()` wrapper first, then systematically apply them across all DAL and action files. Use PostgreSQL generated tsvector columns with GIN indexes for search, offset-based pagination with `COUNT(*) OVER()` for total counts, and `revalidatePath` calls in webhook handlers.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Shared `PaginationParams` type: `{ page: number, pageSize: number, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc' }`. All list DAL functions accept this interface.
- **D-02:** Shared `PaginatedResult<T>` return type: `{ data: T[], total: number, page: number, pageSize: number, totalPages: number }`.
- **D-03:** PostgreSQL full-text search using `tsvector`/`tsquery` with GIN indexes for search functionality. Set up `tsvector` columns on relevant tables.
- **D-04:** Default page size: 20 items. Configurable per-page via URL params.
- **D-05:** All server actions return `ActionResult<T>`: `{ success: true, data: T } | { success: false, error: string, fieldErrors?: Record<string, string[]> }`.
- **D-06:** Create a `safeAction()` wrapper utility that catches Zod validation errors, DB errors, and unexpected errors -- maps each to the appropriate ActionResult shape.
- **D-07:** When Zod validation fails, return `{ success: false, error: 'Validation failed', fieldErrors: { fieldName: ['error message'] } }`.
- **D-08:** Use `revalidatePath()` per affected route after webhook state changes.
- **D-09:** Stripe webhook: revalidate `/dashboard/payments`, `/dashboard/sessions`, `/dashboard/orders` after relevant events.
- **D-10:** Cal.com webhook: revalidate `/dashboard/appointments`, `/dashboard/customers` after booking events.
- **D-11:** Resend webhook: revalidate relevant paths after email status changes if applicable.
- **D-12:** All missing DAL functions follow existing DAL patterns.
- **D-13:** Store checkout page uses DAL function instead of direct db.query call.
- **D-14:** `checkSchedulingConflict()` function wired into appointment creation/update flow.
- **D-15:** Gift card validation in store checkout returns explicit error to user when code is invalid.
- **D-16:** FK validation on inserts (customerId, artistId existence checks) returns clear validation errors.

### Claude's Discretion
- Pagination style (offset vs cursor) -- pick what fits best for solo-artist admin dashboard
- Which columns to include in tsvector for each table
- Whether to add a `withPagination()` Drizzle helper or inline the offset/limit
- Whether safeAction is a higher-order function wrapping the action, or a try/catch utility called inside each action
- Error message granularity for DB errors
- Exact paths to revalidate per webhook event type
- Whether to also revalidate portal paths for client-facing updates
- Scheduling conflict definition (buffer time, overlap detection algorithm)
- Artist profile schema (what fields to expose for CRUD)
- Contact management operations (what status transitions to support)
- Audit logging additions for currently-unlogged mutations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAL-01 | All list DAL functions support cursor/offset pagination with configurable page size | PaginationParams/PaginatedResult types, offset-based pagination with COUNT(*) OVER(), withPagination helper |
| DAL-02 | All list DAL functions support search/filter by relevant text fields | PostgreSQL tsvector generated columns + GIN indexes, plainto_tsquery for multi-word search |
| DAL-03 | Analytics aggregation queries use SQL GROUP BY with date_trunc instead of JS aggregation | SQL builder with sql template literals, date_trunc() for time-bucketed aggregation |
| DAL-04 | All server actions return consistent ActionResult pattern | safeAction() wrapper, Zod 4 z.flattenError() for fieldErrors extraction |
| DAL-05 | All DAL mutations validate FK references exist before insert | Pre-insert existence check pattern with clear error messages |
| DAL-06 | All DAL mutations using .returning() handle empty result arrays | Destructuring guard pattern, throw-or-return-null on empty result |
| DAL-07 | Missing DAL functions created: artist profile CRUD, design approval status, contact update/delete | Follow existing DAL patterns with requireStaffRole, Drizzle query API |
| DAL-08 | Webhook handlers call revalidatePath after state changes | revalidatePath() works in Route Handlers, add to Stripe/Cal/Resend handlers |
| DAL-09 | Store checkout page uses DAL function instead of direct db.query | Move checkout success query to orders DAL |
| DAL-10 | All mutation server actions include audit logging | after() + logAudit() pattern already established in most actions |
| DAL-11 | checkSchedulingConflict() wired into appointment creation/update | Existing function exists, needs integration into createAppointmentAction/updateAppointmentAction |
| DAL-12 | Gift card validation returns explicit error when code is invalid | validateGiftCardAction already returns error, store checkout needs explicit error path |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **ORM:** Drizzle ORM 0.45.1 -- use relational query API for reads, SQL builder for aggregations
- **Database:** Neon PostgreSQL
- **Schema location:** `src/lib/db/schema.ts`
- **DB import:** `import db from @/lib/db`, `schema from @/lib/db/schema`
- **Server Actions for mutations, Route Handlers for webhooks only**
- **DAL pattern:** auth checks in server-only DB functions
- **Drizzle pitfall:** `numeric()` returns strings -- all monetary columns use `mode:'number'`
- **Drizzle pitfall:** mutations need explicit `.returning()` -- without it, only rowCount
- **Drizzle pitfall:** relational API (db.query) does not support aggregations -- use SQL builder
- **Zod version:** 4.3.6 (not v3 -- `.flatten()` is deprecated, use `z.flattenError()`)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | ORM -- pagination, FTS, FK validation, aggregation queries | Already in use, relational + SQL builder APIs |
| zod | 4.3.6 | Validation, error extraction for ActionResult | Already in use, z.flattenError() for field errors |
| next | 16.2.0 | revalidatePath in webhooks, server actions, after() | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date math for scheduling conflict detection | Already in use in appointments DAL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Offset pagination | Cursor pagination | Offset is simpler for admin dashboards with predictable page jumps; cursor better for infinite scroll. Offset is the right choice here. |
| tsvector generated columns | ILIKE with % wildcards | User explicitly chose tsvector/GIN. ILIKE is simpler but does not scale or support stemming. |
| COUNT(*) OVER() | Separate count query | Window function avoids a second query round trip. Single query is preferable. |

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
  dal/
    types.ts               # NEW: PaginationParams, PaginatedResult<T>
    customers.ts           # Updated: getCustomers accepts PaginationParams
    appointments.ts        # Updated: pagination + conflict check wiring
    sessions.ts            # Updated: pagination
    payments.ts            # Updated: pagination
    orders.ts              # Updated: pagination + checkout success query
    contacts.ts            # Updated: pagination + update/delete
    designs.ts             # Updated: pagination + approval status
    products.ts            # Updated: pagination
    media.ts               # Updated: pagination
    audit.ts               # Updated: pagination
    analytics.ts           # Updated: SQL GROUP BY with date_trunc
    gift-cards.ts          # Updated: admin list functions
    settings.ts            # No pagination needed (small dataset)
    portal.ts              # No pagination needed (client data is limited)
    artists.ts             # NEW: artist profile CRUD
    index.ts               # Updated: export new functions
  actions/
    types.ts               # NEW: ActionResult<T> type
    safe-action.ts         # NEW: safeAction wrapper utility
    customer-actions.ts    # Updated: wrap with safeAction
    [all other actions]    # Updated: wrap with safeAction
  db/
    schema.ts              # Updated: tsvector generated columns + GIN indexes
    migrations/            # Generated by drizzle-kit after schema changes
```

### Pattern 1: Paginated DAL Function
**What:** Every list DAL function accepts PaginationParams and returns PaginatedResult
**When to use:** All getCustomers, getAppointments, etc. that power dashboard list pages

```typescript
// src/lib/dal/types.ts
export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

```typescript
// Example: Updated getCustomers
// Source: Drizzle docs + project patterns
export const getCustomers = cache(
  async (params: PaginationParams): Promise<PaginatedResult<...>> => {
    await requireStaffRole();

    const conditions = [];
    if (params.search) {
      conditions.push(
        sql`${schema.customer.searchVector} @@ plainto_tsquery('english', ${params.search})`
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: schema.customer.id,
        firstName: schema.customer.firstName,
        lastName: schema.customer.lastName,
        email: schema.customer.email,
        phone: schema.customer.phone,
        createdAt: schema.customer.createdAt,
        total: sql<number>`cast(count(*) over() as integer)`,
      })
      .from(schema.customer)
      .where(where)
      .orderBy(desc(schema.customer.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    const total = results[0]?.total ?? 0;

    return {
      data: results.map(({ total: _, ...row }) => row),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }
);
```

### Pattern 2: safeAction Wrapper
**What:** Higher-order function that wraps server actions in try/catch, maps errors to ActionResult
**When to use:** All server actions

```typescript
// src/lib/actions/types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

```typescript
// src/lib/actions/safe-action.ts
import { z } from 'zod';
import type { ActionResult } from './types';

export function safeAction<TInput, TOutput>(
  action: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<ActionResult<TOutput>> {
  return async (input: TInput) => {
    try {
      const data = await action(input);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const flat = z.flattenError(error);
        return {
          success: false,
          error: 'Validation failed',
          fieldErrors: flat.fieldErrors as Record<string, string[]>,
        };
      }
      // DB constraint errors
      if (error instanceof Error && error.message.includes('violates foreign key')) {
        return { success: false, error: 'Referenced record does not exist' };
      }
      console.error('Action failed:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };
}
```

### Pattern 3: FK Validation Before Insert
**What:** Check that referenced records exist before attempting insert
**When to use:** createAppointment (customerId), createSession (customerId, artistId), createMediaItem (artistId)

```typescript
// Inside DAL mutation:
export async function createAppointment(data: CreateAppointmentData) {
  await requireStaffRole();

  // FK validation
  const customer = await db.query.customer.findFirst({
    where: eq(schema.customer.id, data.customerId),
    columns: { id: true },
  });
  if (!customer) {
    throw new Error('Customer not found: the specified customer does not exist');
  }

  const [result] = await db.insert(schema.appointment).values({
    ...data,
    scheduledDate: new Date(data.scheduledDate),
  }).returning();

  if (!result) {
    throw new Error('Failed to create appointment');
  }
  return result;
}
```

### Pattern 4: Webhook Revalidation
**What:** Call revalidatePath after webhook state mutations
**When to use:** All webhook handlers that change data

```typescript
// In Stripe webhook handler, after successful state change:
import { revalidatePath } from 'next/cache';

// After checkout.session.completed:
revalidatePath('/dashboard/payments');
revalidatePath('/dashboard/sessions');

// After store checkout:
revalidatePath('/dashboard/orders');

// After charge.refunded:
revalidatePath('/dashboard/payments');
revalidatePath('/dashboard/sessions');
```

### Pattern 5: tsvector Generated Column
**What:** PostgreSQL generated column that auto-computes search vectors
**When to use:** Tables with text fields that need search (customer, appointment, contact, product, design, order)

```typescript
// Source: https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns
import { customType } from 'drizzle-orm/pg-core';

export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// In customer table definition:
export const customer = pgTable('customer', {
  // ... existing columns ...
  searchVector: tsvector('search_vector')
    .generatedAlwaysAs((): SQL =>
      sql`setweight(to_tsvector('english', coalesce(${customer.firstName}, '') || ' ' || coalesce(${customer.lastName}, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(${customer.email}, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(${customer.phone}, '')), 'C')`
    ),
}, (table) => [
  // ... existing indexes ...
  index('customer_search_idx').using('gin', table.searchVector),
]);
```

### Pattern 6: Analytics with SQL date_trunc
**What:** Use SQL GROUP BY with date_trunc instead of loading rows into JS
**When to use:** getRevenueData, getClientAcquisitionData, getBookingTrends

```typescript
// Replace JS aggregation with SQL aggregation:
export const getRevenueData = cache(async (months: number = 12) => {
  await requireStaffRole();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return db.select({
    month: sql<string>`to_char(date_trunc('month', ${tattooSession.appointmentDate}), 'YYYY-MM')`,
    revenue: sql<number>`coalesce(sum(${tattooSession.totalCost}), 0)`,
    count: sql<number>`cast(count(*) as integer)`,
  })
    .from(tattooSession)
    .where(and(
      eq(tattooSession.status, 'COMPLETED'),
      gte(tattooSession.appointmentDate, startDate),
    ))
    .groupBy(sql`date_trunc('month', ${tattooSession.appointmentDate})`)
    .orderBy(sql`date_trunc('month', ${tattooSession.appointmentDate})`);
});
```

### Anti-Patterns to Avoid
- **Throwing unhandled errors from server actions:** Always catch and return ActionResult. Never let Zod parse errors or DB constraint errors propagate to the client as unstructured Error objects.
- **Loading all rows then filtering in JS:** The analytics DAL currently does this (getRevenueData, getClientAcquisitionData, getBookingTrends). Move aggregation to SQL.
- **Using `ilike` for search instead of tsvector:** The user explicitly chose full-text search. Do not fall back to `ilike` patterns (the existing `searchCustomers` function uses `ilike` -- this gets replaced).
- **Forgetting to handle empty .returning() arrays:** `const [result] = await db.insert(...).returning()` -- if no rows match, `result` is `undefined`. Always guard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-text search | Custom ILIKE chains with concatenation | PostgreSQL tsvector + GIN with generated columns | Handles stemming, ranking, multi-word queries, diacritics. ILIKE breaks on partial words and doesn't scale. |
| Pagination total count | Separate COUNT(*) query | `COUNT(*) OVER()` window function in same query | Single round trip to DB, guaranteed consistency between count and data |
| Error type discrimination | Manual instanceof chains in every action | safeAction wrapper with pattern matching | Centralizes error handling, ensures consistent ActionResult shape |
| Search input sanitization | Manual escaping of tsquery special chars | `plainto_tsquery()` instead of `to_tsquery()` | plainto_tsquery handles plain text safely -- no injection risk from &, |, ! chars |

## Common Pitfalls

### Pitfall 1: tsvector Generated Columns Need a Migration
**What goes wrong:** Adding generated columns to schema.ts is not enough -- Drizzle Kit must generate a migration, and the migration must be applied to the database.
**Why it happens:** Generated columns are DDL changes, not application-level changes. The schema change alone does nothing.
**How to avoid:** After updating schema.ts, run `drizzle-kit generate` to produce a migration, then `drizzle-kit migrate` or `drizzle-kit push` to apply it.
**Warning signs:** Search returns no results even with matching data. Column does not exist errors at runtime.

### Pitfall 2: COUNT(*) OVER() Returns 0 on Empty Result Set
**What goes wrong:** When no rows match the WHERE clause, `results` is an empty array, so `results[0]?.total` is undefined.
**Why it happens:** Window functions only run on rows that pass the WHERE filter. If no rows pass, there are no rows to attach the count to.
**How to avoid:** Default to 0: `const total = results[0]?.total ?? 0`.
**Warning signs:** Pagination shows "undefined" total or crashes on `.totalPages` calculation.

### Pitfall 3: Zod 4 Deprecates .flatten() on Error Instance
**What goes wrong:** Calling `error.flatten()` on a ZodError instance may work but is deprecated in Zod 4.
**Why it happens:** Zod 4 moved error formatting to top-level utility functions.
**How to avoid:** Use `z.flattenError(error)` instead of `error.flatten()`. The return shape is the same: `{ formErrors: string[], fieldErrors: Record<string, string[]> }`.
**Warning signs:** TypeScript deprecation warnings, potential API removal in future Zod versions.

### Pitfall 4: revalidatePath in Webhook Handlers Must Not Throw
**What goes wrong:** If `revalidatePath` fails, the webhook handler returns 500, and Stripe retries the webhook.
**Why it happens:** `revalidatePath` is a cache invalidation operation that could theoretically fail if the cache backend has issues.
**How to avoid:** Call `revalidatePath` after the critical DB operations succeed. The revalidation is best-effort -- a failure there should not fail the webhook. Consider wrapping in try/catch if needed, but in practice revalidatePath does not throw.
**Warning signs:** Stripe/Cal webhook retry storms.

### Pitfall 5: Self-Referencing Generated Column in Drizzle Schema
**What goes wrong:** Using `${customer.firstName}` inside a generated column definition for the same table causes a circular reference error.
**Why it happens:** The table object is not yet fully defined when the generated column references it.
**How to avoid:** Use raw SQL string references to column names within generated columns when needed, or use the `sql.raw()` approach. Alternatively, reference the column via the table parameter in the third argument of pgTable. Test the exact Drizzle syntax carefully.
**Warning signs:** TypeScript errors about circular references, runtime errors during schema loading.

### Pitfall 6: safeAction Must Not Catch redirect() Calls
**What goes wrong:** Next.js `redirect()` throws a special error internally. If safeAction catches it, the redirect never happens.
**Why it happens:** `redirect()` uses throw internally as a control flow mechanism.
**How to avoid:** In the safeAction catch block, re-throw errors that are not plain Error instances or check for Next.js redirect/notFound error types. Alternatively, since server actions should return ActionResult (not redirect), ensure requireRole throws redirect before safeAction wraps the logic.
**Warning signs:** Actions that should redirect to /login instead return `{ success: false, error: 'An unexpected error occurred' }`.

### Pitfall 7: Cache Incompatibility with Paginated Functions
**What goes wrong:** React `cache()` memoizes based on arguments. Paginated functions receive different PaginationParams each call, so cache effectively does nothing.
**Why it happens:** `cache()` is designed for deduplication within a single request, not across requests.
**How to avoid:** This is actually fine. `cache()` still deduplicates multiple calls with the same params within a single server render. Keep it. The concern is about callers who expect cross-request caching -- that requires Next.js `unstable_cache` or ISR, which is out of scope.
**Warning signs:** None -- this is expected behavior.

## Code Examples

### Shared Types (verified pattern from codebase analysis)

```typescript
// src/lib/dal/types.ts
export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;
```

### safeAction Wrapper (recommended: higher-order function)

```typescript
// src/lib/actions/safe-action.ts
'use server';

import { z } from 'zod';
import type { ActionResult } from './types';

// Re-export for convenience
export type { ActionResult } from './types';

/**
 * Wraps an async function to always return ActionResult<T>.
 * Catches Zod errors (with fieldErrors), known DB errors, and unexpected errors.
 */
export async function safeAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    // Let Next.js internal errors (redirect, notFound) propagate
    if (error instanceof Error &&
        (error.message === 'NEXT_REDIRECT' || error.message === 'NEXT_NOT_FOUND')) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      const flat = z.flattenError(error);
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      };
    }

    if (error instanceof Error) {
      // FK validation errors from DAL
      if (error.message.startsWith('Customer not found') ||
          error.message.startsWith('Artist not found') ||
          error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }
      // DB constraint violations
      if (error.message.includes('violates foreign key')) {
        return { success: false, error: 'Referenced record does not exist' };
      }
      if (error.message.includes('violates unique constraint')) {
        return { success: false, error: 'A record with this value already exists' };
      }
      // Scheduling conflicts
      if (error.message.includes('scheduling conflict')) {
        return { success: false, error: error.message };
      }
    }

    console.error('Unexpected action error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

### Usage in Server Action (refactored pattern)

```typescript
// src/lib/actions/customer-actions.ts
'use server';

import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/security/validation';
import { createCustomer, updateCustomer, deleteCustomer } from '@/lib/dal/customers';
import { logAudit } from '@/lib/dal/audit';
import { requireRole } from '@/lib/auth';
import { safeAction } from './safe-action';
import type { ActionResult } from './types';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function createCustomerAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const raw = Object.fromEntries(formData);
    const data = {
      ...raw,
      allergies: formData.getAll('allergies').map(String).filter(Boolean),
      medicalConditions: formData.getAll('medicalConditions').map(String).filter(Boolean),
    };
    const validated = CreateCustomerSchema.parse(data);
    const result = await createCustomer(validated);

    const hdrs = await headers();
    after(() =>
      logAudit({
        userId: session.user.id,
        action: 'CREATE',
        resource: 'customer',
        resourceId: result.id,
        ip: hdrs.get('x-forwarded-for') ?? 'unknown',
        userAgent: hdrs.get('user-agent') ?? 'unknown',
        metadata: { changes: validated },
      })
    );

    revalidatePath('/dashboard/customers');
    return { id: result.id };
  });
}
```

### tsvector Custom Type + Generated Column

```typescript
// Source: https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns
import { customType } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';

export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});
```

### Recommended tsvector Columns Per Table

| Table | Columns in tsvector | Weights |
|-------|---------------------|---------|
| customer | firstName + lastName (A), email (B), phone (C), notes (D) | Name most relevant for admin search |
| appointment | firstName + lastName (A), email (B), description + notes (C), tattooType (D) | Name search primary |
| tattooSession | designDescription (A), placement + style (B), notes (C) | Design description primary |
| contact | name (A), email (B), message (C) | Name search primary |
| product | name (A), description (B) | Name search primary |
| tattooDesign | name (A), description + style (B), tags (C) | Name search primary |
| order | email (A), shippingName (B), notes (C) | Email search primary |
| payment | No search needed (query by FK, status, type) | -- |
| auditLog | action + resource (A) | Action type search |
| media (tattooDesign) | Same as tattooDesign | -- |

### Webhook Revalidation Map

```
Stripe webhook events:
  checkout.session.completed (tattoo payment):
    -> /dashboard/payments, /dashboard/sessions
    -> /portal (optional: client sees updated payment)
  checkout.session.completed (store):
    -> /dashboard/orders
  checkout.session.completed (gift card):
    -> (no dashboard page for gift cards yet -- Phase 16)
  payment_intent.succeeded:
    -> /dashboard/payments
  payment_intent.payment_failed:
    -> /dashboard/payments
  charge.refunded:
    -> /dashboard/payments, /dashboard/sessions

Cal.com webhook events:
  BOOKING_CREATED:
    -> /dashboard/appointments, /dashboard/customers
  BOOKING_RESCHEDULED:
    -> /dashboard/appointments
  BOOKING_CANCELLED:
    -> /dashboard/appointments

Resend webhook events:
  email.bounced / email.complained:
    -> Currently only logs -- no DB mutation, no revalidation needed
    -> If future phases add email status tracking, revalidate then
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ILIKE search | tsvector + GIN FTS | PostgreSQL 12+ (generated columns) | Stemming, ranking, proper multi-word search |
| Separate COUNT query | COUNT(*) OVER() | Standard SQL window function | Single round-trip for paginated queries |
| Zod error.flatten() | z.flattenError(error) | Zod 4.0 (2025) | Instance method deprecated, use utility function |
| JS in-memory aggregation | SQL GROUP BY + date_trunc | Always available | Dramatically reduces data transfer, faster for large datasets |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DAL-01 | Paginated list functions return PaginatedResult | unit | `bun run test src/__tests__/dal-pagination.test.ts -x` | Wave 0 |
| DAL-02 | Search filters results via tsvector | unit | `bun run test src/__tests__/dal-search.test.ts -x` | Wave 0 |
| DAL-03 | Analytics uses SQL aggregation | unit | `bun run test src/__tests__/dal-analytics.test.ts -x` | Wave 0 |
| DAL-04 | Actions return ActionResult consistently | unit | `bun run test src/__tests__/safe-action.test.ts -x` | Wave 0 |
| DAL-05 | FK validation returns clear error | unit | `bun run test src/__tests__/dal-fk-validation.test.ts -x` | Wave 0 |
| DAL-06 | Empty .returning() handled gracefully | unit | `bun run test src/__tests__/dal-returning.test.ts -x` | Wave 0 |
| DAL-07 | Missing DAL functions exist and work | unit | `bun run test src/__tests__/dal-missing.test.ts -x` | Wave 0 |
| DAL-08 | Webhooks call revalidatePath | unit | `bun run test src/__tests__/webhook-revalidation.test.ts -x` | Wave 0 |
| DAL-09 | Checkout success uses DAL | unit | `bun run test src/__tests__/store-checkout.test.ts -x` | Existing (update) |
| DAL-10 | Audit logging on all mutations | unit | `bun run test src/__tests__/audit-coverage.test.ts -x` | Wave 0 |
| DAL-11 | Conflict check wired to appointment flow | unit | `bun run test src/__tests__/scheduling-conflict.test.ts -x` | Wave 0 |
| DAL-12 | Gift card invalid code returns explicit error | unit | `bun run test src/__tests__/gift-card.test.ts -x` | Existing (update) |

### Sampling Rate
- **Per task commit:** `bun run test --reporter=verbose`
- **Per wave merge:** `bun run test --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/dal-pagination.test.ts` -- covers DAL-01
- [ ] `src/__tests__/dal-search.test.ts` -- covers DAL-02
- [ ] `src/__tests__/dal-analytics.test.ts` -- covers DAL-03
- [ ] `src/__tests__/safe-action.test.ts` -- covers DAL-04
- [ ] `src/__tests__/dal-fk-validation.test.ts` -- covers DAL-05
- [ ] `src/__tests__/dal-returning.test.ts` -- covers DAL-06
- [ ] `src/__tests__/dal-missing.test.ts` -- covers DAL-07
- [ ] `src/__tests__/webhook-revalidation.test.ts` -- covers DAL-08
- [ ] `src/__tests__/audit-coverage.test.ts` -- covers DAL-10
- [ ] `src/__tests__/scheduling-conflict.test.ts` -- covers DAL-11

## Inventory of Changes Required

### DAL Files Needing Pagination + Search (10 files)

| File | Current List Function | Pagination Needed | Search tsvector Columns |
|------|----------------------|-------------------|------------------------|
| customers.ts | getCustomers() - returns all rows | Yes | firstName, lastName, email, phone |
| appointments.ts | getAppointments() - returns all rows | Yes | firstName, lastName, email, description |
| sessions.ts | getSessions() - has limit/offset but no total count | Yes (add total) | designDescription, placement, style |
| payments.ts | getPayments() - has limit/offset but no total count | Yes (add total) | Search by customer name (join) |
| orders.ts | getOrders() - has limit/offset but no total count | Yes (add total) | email, shippingName |
| contacts.ts | getContacts() - returns max 100, no pagination | Yes | name, email, message |
| designs.ts | getAllDesigns() - returns all rows | Yes | name, description, style |
| products.ts | getProducts() - returns all rows | Yes | name, description |
| media.ts | getMediaItems() - has limit/offset but no total count | Yes (add total) | name, description, style |
| audit.ts | getAuditLogs() - has limit/offset but no total count | Yes (add total) | action, resource |

### Server Actions Needing ActionResult Refactor (13 files)

| File | Current Return Pattern | Throws? | Has Audit? |
|------|----------------------|---------|------------|
| customer-actions.ts | Returns raw result | Zod .parse() throws | Yes |
| appointment-actions.ts | Returns raw result | Zod .parse() throws | Yes |
| session-actions.ts | Returns raw result | Zod .parse() throws | Yes |
| media-actions.ts | Returns raw result | Zod .parse() throws | Yes |
| product-actions.ts | Returns { success, product } | Stripe calls can throw | Yes |
| order-actions.ts | Returns { success } | Zod .parse() throws | Yes |
| payment-actions.ts | Returns { success, checkoutUrl } | Multiple throw points | Yes |
| settings-actions.ts | Returns raw result | Zod .parse() throws | Yes |
| contact-actions.ts | Returns { success, error/errors } | Partial (has try/catch) | No (needs adding) |
| contact-status-action.ts | Returns { success } | No error handling | No (needs adding) |
| gift-card-actions.ts | Returns { success, checkoutUrl } or { valid, error } | Zod .parse() throws | No (needs adding) |
| store-actions.ts | Returns { success, checkoutUrl } | Multiple throw points | No (needs adding) |
| portal-actions.ts | Returns { success, error } | Uses safeParse already | No (needs adding) |

### Webhook Handlers Needing revalidatePath (3 files)

| File | Current revalidation | Needs Adding |
|------|---------------------|--------------|
| stripe/route.ts | None | /dashboard/payments, /dashboard/sessions, /dashboard/orders |
| cal/route.ts | None | /dashboard/appointments, /dashboard/customers |
| resend/route.ts | None (no DB mutations) | None needed currently |

### Missing DAL Functions (DAL-07)

| Function | File | Purpose |
|----------|------|---------|
| getArtistProfile / updateArtistProfile | artists.ts (NEW) | Artist profile CRUD for PAGE-01 |
| updateDesignApprovalStatus | designs.ts | Set isApproved on tattooDesign for PAGE-07 |
| updateContact / deleteContact | contacts.ts | Full CRUD for PAGE-04 |
| getGiftCards | gift-cards.ts | Admin list view for PAGE-05 |

### Files with Direct DB Access Needing DAL Migration (DAL-09)

| File | Current Pattern | Should Use |
|------|----------------|------------|
| `src/app/(store)/store/checkout/success/page.tsx` | Direct `db.query.order.findFirst(...)` | New DAL function `getOrderByCheckoutSession(sessionId)` |

## Open Questions

1. **tsvector self-referencing syntax in Drizzle 0.45.1**
   - What we know: Drizzle docs show generated columns using the table variable, but self-reference within the same pgTable definition can cause issues
   - What's unclear: Whether Drizzle 0.45.1 handles `generatedAlwaysAs` with self-referencing columns cleanly or if it needs raw SQL
   - Recommendation: Test the generated column pattern during implementation. If self-reference fails, use a raw SQL migration instead of schema-defined generated columns, keeping the Drizzle schema as `tsvector('search_vector')` without the generated clause.

2. **Portal path revalidation from webhooks**
   - What we know: Stripe webhooks update payment status; portal users view their payments at /portal
   - What's unclear: Whether revalidating portal paths from webhooks provides value given portal pages use `cache()` per-request
   - Recommendation: Include portal revalidation (e.g., `/portal`) for Stripe payment events since portal users may have the page open. Low cost, potential UX improvement.

## Sources

### Primary (HIGH confidence)
- Drizzle ORM official docs - PostgreSQL full-text search: https://orm.drizzle.team/docs/guides/postgresql-full-text-search
- Drizzle ORM official docs - Full-text search with generated columns: https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns
- Drizzle ORM official docs - Limit/Offset pagination: https://orm.drizzle.team/docs/guides/limit-offset-pagination
- Zod 4 error formatting: https://zod.dev/error-formatting
- Next.js revalidatePath: https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- Codebase analysis: 16 DAL files, 13 action files, 3 webhook handlers reviewed in full

### Secondary (MEDIUM confidence)
- COUNT(*) OVER() pattern in Drizzle: https://bluebones.net/2025/06/count-over-in-drizzle/
- Drizzle pagination discussion: https://github.com/drizzle-team/drizzle-orm/discussions/610

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use and verified in package.json
- Architecture: HIGH - patterns derived from existing codebase analysis + official Drizzle/Next.js docs
- Pitfalls: HIGH - verified against official docs and known Drizzle/Zod 4/Next.js behaviors
- tsvector generated column syntax: MEDIUM - official docs confirm the pattern but self-referencing needs runtime validation

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack, no fast-moving dependencies)
