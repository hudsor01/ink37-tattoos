# Phase 14: Data Layer Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 14-data-layer-fixes
**Areas discussed:** Pagination & search pattern, Server action return contract, Webhook revalidation strategy, Missing DAL & wiring gaps

---

## Pagination & Search Pattern

### Q1: Pagination style?

| Option | Description | Selected |
|--------|-------------|----------|
| Offset-based | Standard offset/limit with total count. Simple, works with page numbers. | |
| Cursor-based | Uses last-seen ID. Better for large datasets. | |
| You decide | Claude picks best fit. | ✓ |

**User's choice:** You decide

### Q2: Search approach?

| Option | Description | Selected |
|--------|-------------|----------|
| ILIKE pattern matching | Simple SQL ILIKE on text columns. Fast, no setup. | |
| PostgreSQL full-text search | tsvector/tsquery with GIN indexes. Better relevance ranking. | ✓ |
| You decide | Claude picks based on data volume. | |

**User's choice:** PostgreSQL full-text search

### Q3: Shared pagination interface?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared PaginationParams type | Common interface for all list DAL functions. | ✓ |
| Per-function params | Each function defines its own shape. | |
| You decide | Claude picks. | |

**User's choice:** Shared PaginationParams type

---

## Server Action Return Contract

### Q1: Return value standardization?

| Option | Description | Selected |
|--------|-------------|----------|
| ActionResult<T> wrapper | { success, data?, error?, fieldErrors? } with safeAction() helper. | ✓ |
| Return raw, catch in components | Keep current throw pattern. | |
| You decide | Claude picks. | |

**User's choice:** ActionResult<T> wrapper

### Q2: Include field-level validation errors?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — include fieldErrors | Zod errors return per-field messages for inline UI. | ✓ |
| No — just string error | Simpler, single toast. | |
| You decide | Claude picks. | |

**User's choice:** Yes — include fieldErrors

---

## Webhook Revalidation Strategy

### Q1: How to trigger UI updates?

| Option | Description | Selected |
|--------|-------------|----------|
| revalidatePath per affected route | Each webhook calls revalidatePath for specific dashboard pages. | ✓ |
| revalidateTag-based | Tag data fetches, revalidate by tag. | |
| You decide | Claude picks. | |

**User's choice:** revalidatePath per affected route

---

## Missing DAL & Wiring Gaps

### Q1: Preferences on missing functions?

| Option | Description | Selected |
|--------|-------------|----------|
| You decide on all | Claude implements following existing patterns. | ✓ |
| Discuss specifics | Walk through each missing function. | |
| Discuss scheduling conflict only | Focus on conflict detection design. | |

**User's choice:** You decide on all

---

## Claude's Discretion

- Pagination style (offset vs cursor)
- tsvector column selection per table
- Pagination helper pattern (withPagination vs inline)
- safeAction implementation style (HOF vs utility)
- DB error message granularity
- Exact revalidation paths per webhook event
- Scheduling conflict logic (buffer time, overlap algorithm)
- Artist profile schema fields
- Contact status transitions
- Audit logging additions

## Deferred Ideas

None — discussion stayed within phase scope
