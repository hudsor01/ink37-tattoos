# Phase 28: Fix PR #5 Notification Retention Policy Review Issues - Research

**Researched:** 2026-04-02
**Domain:** Security hardening, distributed locking, environment validation, SQL optimization, cron infrastructure
**Confidence:** HIGH

## Summary

Phase 28 addresses eight specific code quality, security, and robustness issues identified during PR #5 review of the notification retention policy feature. The changes span four files: the cron route handler, the DAL purge function, the Zod env schema, and an n8n workflow configuration.

All eight fixes use libraries already in the project (`crypto` from Node.js, `@upstash/redis` 1.37.0, `zod` 4.3.6, Drizzle ORM 0.45.1). No new dependencies are needed. The fixes are independent of each other and can be implemented in any order, though the env schema fix should land before the route handler fix since the route handler will consume the coerced values.

**Primary recommendation:** Fix all eight issues in a single pass. Each fix is small (5-30 lines changed), well-scoped, and independently verifiable. The timing-safe comparison fix should also be applied to the other two cron routes (balance-due, no-show-followup) since they share the identical vulnerable pattern.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRON-SEC-01 | Bearer token uses crypto.timingSafeEqual instead of === | Node.js crypto module HMAC-then-compare pattern; verified working on this Node version |
| CRON-SEC-02 | Redis lock stores unique value, release checks value matches | Redis.io Lua script pattern for owner-checked release; Upstash redis.eval() API verified |
| CRON-ROB-01 | Non-numeric env vars caught at startup via zod coercion | z.coerce.number().int().positive().optional() verified in Zod 4.3.6 |
| CRON-ROB-02 | Purge SQL does not use RETURNING clause | Neon serverless driver returns rowCount on all queries including DELETE without RETURNING |
| CRON-ROB-03 | purgeOldNotifications documents/guards its intentional bypass of requireStaffRole | Code documentation + JSDoc comment pattern |
| CRON-CLEAN-01 | Redis client shared between tryAcquireLock and releaseLock | Module-level lazy singleton pattern |
| CRON-CLEAN-02 | Env schema uses z.coerce.number() for all three notification env vars | Same as CRON-ROB-01 -- Zod coercion moves parseInt out of route handler |
| CRON-INFRA-01 | n8n workflow configured for notifications-cleanup endpoint | Follow existing balance-due-workflow.json pattern in n8n/ directory |
</phase_requirements>

## Standard Stack

### Core (already installed -- no additions needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `crypto` (Node.js built-in) | Node 22+ | Timing-safe token comparison | Built-in, no dependency; `timingSafeEqual` is the standard defense against timing attacks |
| `@upstash/redis` | 1.37.0 | Distributed lock with Lua eval | Already in project; `eval()` method supports Lua scripts for atomic check-and-delete |
| `zod` | 4.3.6 | Env var coercion and validation | Already in project; `z.coerce.number()` converts strings to numbers at parse time |
| `drizzle-orm` | 0.45.1 | SQL query execution | Already in project; `db.execute(sql\`...\`)` returns `rowCount` without RETURNING |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Redis lock | `@upstash/lock` v0.2.1 | @upstash/lock explicitly warns against correctness guarantees -- "Do not use it to guarantee correctness of your system". v0.2.1 is early-stage. Hand-rolled Lua script is more reliable. |
| HMAC-then-timingSafeEqual | Direct Buffer.from + timingSafeEqual | Direct Buffer comparison throws if lengths differ (attacker-controlled input). HMAC produces fixed-length digests, eliminating the length oracle. |
| z.coerce.number() | z.string().pipe(z.coerce.number()) | Pipe is more verbose for no benefit here; coerce handles the string-to-number conversion cleanly |

## Architecture Patterns

### Pattern 1: Timing-Safe Bearer Token Comparison

**What:** Replace string `===` comparison with HMAC-then-timingSafeEqual to prevent timing attacks on the CRON_SECRET.

**When to use:** Any endpoint that compares a user-supplied secret against an expected value.

**Why HMAC, not raw Buffer comparison:** `crypto.timingSafeEqual` throws `RangeError` if inputs have different byte lengths. Since the attacker controls the Authorization header length, a raw Buffer approach would leak length information (error vs no-error). HMAC produces fixed-length (32-byte) digests regardless of input length.

**Example:**
```typescript
// Source: Node.js crypto docs + Simon Willison's TIL on constant-time string comparison
import crypto from 'node:crypto';

function timingSafeCompare(a: string, b: string): boolean {
  const hmac = (val: string) =>
    crypto.createHmac('sha256', 'constant-key').update(val).digest();
  return crypto.timingSafeEqual(hmac(a), hmac(b));
}

// Usage in route handler:
const authHeader = request.headers.get('authorization') ?? '';
if (!timingSafeCompare(authHeader, `Bearer ${secret}`)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Pattern 2: Owner-Checked Distributed Lock via Lua Script

**What:** Store a unique value (UUID) when acquiring the lock. On release, use a Lua script to atomically check the value matches before deleting. This prevents Process A from releasing Process B's lock.

**When to use:** Any distributed lock where multiple processes could overlap due to network latency or clock skew.

**Example:**
```typescript
// Source: redis.io distributed locks documentation + Upstash Redis eval API
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

const LOCK_KEY = 'lock:notification-cleanup';
const LOCK_TTL_SECONDS = 300;

let lockOwner: string | null = null;

async function tryAcquireLock(redis: Redis): Promise<boolean> {
  const owner = crypto.randomUUID();
  const result = await redis.set(LOCK_KEY, owner, { nx: true, ex: LOCK_TTL_SECONDS });
  if (result === 'OK') {
    lockOwner = owner;
    return true;
  }
  return false;
}

async function releaseLock(redis: Redis): Promise<void> {
  if (!lockOwner) return;
  // Atomic check-and-delete via Lua script
  const RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(RELEASE_SCRIPT, [LOCK_KEY], [lockOwner]);
  lockOwner = null;
}
```

**Upstash Redis eval API signature (verified from installed 1.37.0 types):**
```typescript
eval<TArgs extends unknown[], TData = unknown>(
  script: string,
  keys: string[],
  args: TArgs
): Promise<TData>
```

### Pattern 3: Zod Coercion for Numeric Env Vars

**What:** Use `z.coerce.number().int().positive().optional()` in the Zod env schema so non-numeric strings fail at app startup instead of silently producing `NaN` at runtime.

**When to use:** Any env var that should be a number but arrives as a string from `process.env`.

**Example:**
```typescript
// Source: Zod 4 official docs (zod.dev/api)
const envSchema = z.object({
  // ...existing fields...
  NOTIFICATION_RETENTION_READ_DAYS: z.coerce.number().int().positive().optional(),
  NOTIFICATION_RETENTION_UNREAD_DAYS: z.coerce.number().int().positive().optional(),
  NOTIFICATION_CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().optional(),
});
```

**Behavior verified on Zod 4.3.6:**
| Input | Result |
|-------|--------|
| `undefined` | `undefined` (passes optional) |
| `"30"` | `30` (coerced to number) |
| `"abc"` | Throws ZodError (NaN is not a number) |
| `"-5"` | Throws ZodError (not positive) |
| `"0"` | Throws ZodError (not positive) |
| `"1000"` | `1000` (valid) |

### Pattern 4: Shared Redis Client (Lazy Singleton)

**What:** Create the Redis client once at module scope and reuse across both lock functions instead of instantiating `new Redis()` in each function call.

**Example:**
```typescript
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}
```

### Anti-Patterns to Avoid

- **String comparison for secrets:** `===` leaks timing information that reveals how many leading bytes match. Always use `crypto.timingSafeEqual`.
- **Unconditional lock deletion:** `redis.del(key)` without checking ownership can delete another process's lock. Always use the Lua check-and-delete pattern.
- **parseInt without validation:** `parseInt("abc", 10)` returns `NaN`. Zod coercion catches this at startup.
- **RETURNING for count-only queries:** `RETURNING id` transfers all deleted IDs over the wire. `rowCount` is available in the query result metadata for free.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timing-safe string comparison | Custom byte-by-byte loop | `crypto.createHmac` + `crypto.timingSafeEqual` | Subtle bugs in hand-rolled constant-time code; HMAC normalizes lengths |
| Distributed lock library | Full lock abstraction | Inline Lua script via `redis.eval()` | `@upstash/lock` v0.2.1 is unstable and explicitly warns against correctness guarantees; the Lua pattern is 7 lines |
| Env var number parsing | Manual parseInt + isNaN checks | `z.coerce.number().int().positive().optional()` | Zod already validates the full env schema at startup; adding coercion is one-line change per field |
| n8n workflow JSON | Custom scheduler | Follow existing `n8n/balance-due-workflow.json` pattern | Three workflows already exist with identical structure; copy and adapt |

## Common Pitfalls

### Pitfall 1: timingSafeEqual Length Mismatch
**What goes wrong:** `crypto.timingSafeEqual` throws `RangeError` if the two buffers have different byte lengths. If you use `Buffer.from(userInput)` directly, an attacker sending a short token triggers an error, leaking that the lengths differ.
**Why it happens:** The function is designed for comparing fixed-length cryptographic outputs (HMAC, hashes), not arbitrary strings.
**How to avoid:** Always HMAC both values first. HMAC produces fixed 32-byte (SHA-256) output regardless of input length.
**Warning signs:** Uncaught `RangeError` in error logs from the cron auth check.

### Pitfall 2: Lock Owner Race Condition
**What goes wrong:** Process A acquires lock, takes too long, lock expires (TTL). Process B acquires lock. Process A finishes and calls `redis.del(key)`, deleting Process B's lock. Process C now runs concurrently with B.
**Why it happens:** Unconditional `del` does not verify who owns the lock.
**How to avoid:** Store a unique UUID as the lock value. Use Lua script to atomically check value before deleting.
**Warning signs:** Overlapping cleanup runs in logs (two "Starting notification cleanup" entries close together).

### Pitfall 3: Zod Coerce Empty String to 0
**What goes wrong:** `z.coerce.number()` converts empty string `""` to `0` (because `Number("") === 0`). If Vercel sets an unset env var to `""`, you get 0 retention days instead of the default.
**Why it happens:** JavaScript's `Number("")` returns `0`, not `NaN`.
**How to avoid:** The existing `env.ts` already strips empty strings to `undefined` before Zod parsing (line 40-42: `Object.entries(process.env).filter(([, v]) => v !== '')`). This means empty strings become `undefined`, which satisfies `.optional()` correctly. The combination of the existing cleanup + `z.coerce.number().optional()` is safe.
**Warning signs:** Retention days set to 0 in production logs.

### Pitfall 4: SQL RETURNING on Large Deletes
**What goes wrong:** `RETURNING id` on a DELETE that removes 1000 rows transfers 1000 UUIDs (~36KB) over the network. The data is never used -- only `rowCount` is checked.
**Why it happens:** Copy-paste from patterns where RETURNING is needed for data.
**How to avoid:** Remove RETURNING clause. The Neon serverless driver always includes `rowCount` in the query result metadata (verified in `@neondatabase/serverless` 1.0.2 types: `QueryResult.rowCount: number`).
**Warning signs:** Unnecessary data transfer in query response; potential memory pressure on large batch deletes.

### Pitfall 5: purgeOldNotifications Auth Confusion
**What goes wrong:** A future developer sees `purgeOldNotifications` has no `requireStaffRole()` call (unlike every other function in the file) and adds one, breaking the cron job.
**Why it happens:** The function intentionally skips auth because it runs from an API route that does its own Bearer token auth. But this intent is not documented.
**How to avoid:** Add a prominent JSDoc comment and/or a guard comment at the top of the function explaining the intentional auth bypass.
**Warning signs:** Cron cleanup suddenly returning 403/redirect errors.

## Code Examples

### Complete Timing-Safe Bearer Auth

```typescript
// Source: Node.js crypto docs (nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
import crypto from 'node:crypto';

/**
 * Constant-time string comparison using HMAC to normalize lengths.
 * Prevents timing attacks where string === leaks match position.
 */
function timingSafeCompare(a: string, b: string): boolean {
  const key = crypto.randomBytes(32); // random key per comparison
  const hmacA = crypto.createHmac('sha256', key).update(a).digest();
  const hmacB = crypto.createHmac('sha256', key).update(b).digest();
  return crypto.timingSafeEqual(hmacA, hmacB);
}
```

### Complete Lock Acquire/Release with Owner Check

```typescript
// Source: redis.io/docs/latest/develop/clients/patterns/distributed-locks/
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';

const LOCK_KEY = 'lock:notification-cleanup';
const LOCK_TTL = 300; // 5 minutes

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function tryAcquireLock(redis: Redis): Promise<string | null> {
  const owner = crypto.randomUUID();
  const result = await redis.set(LOCK_KEY, owner, { nx: true, ex: LOCK_TTL });
  return result === 'OK' ? owner : null;
}

async function releaseLock(redis: Redis, owner: string): Promise<void> {
  await redis.eval(RELEASE_SCRIPT, [LOCK_KEY], [owner]);
}
```

### Zod Env Schema with Coerced Numbers

```typescript
// Source: zod.dev/api (Zod 4 coerce documentation)
const envSchema = z.object({
  // ... existing fields ...
  NOTIFICATION_RETENTION_READ_DAYS: z.coerce.number().int().positive().optional(),
  NOTIFICATION_RETENTION_UNREAD_DAYS: z.coerce.number().int().positive().optional(),
  NOTIFICATION_CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().optional(),
});
```

### DELETE without RETURNING

```typescript
// Source: Drizzle ORM docs + @neondatabase/serverless 1.0.2 types
const result = await db.execute(sql`
  DELETE FROM ${notification}
  WHERE id IN (
    SELECT id FROM ${notification}
    WHERE ${eq(notification.isRead, true)} AND ${lt(notification.createdAt, readCutoff)}
    ORDER BY ${notification.createdAt} ASC
    LIMIT ${batchSize}
  )
`);
const deletedCount = result.rowCount ?? 0;
```

### n8n Workflow JSON (notifications-cleanup)

```json
{
  "name": "Ink37 - Notification Cleanup",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "triggerAtHour": 3,
              "triggerAtMinute": 0
            }
          ]
        }
      },
      "id": "schedule-trigger",
      "name": "Daily 3AM CT",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://ink37tattoos.com/api/cron/notifications-cleanup",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": { "timeout": 30000 },
        "retryOnFail": true,
        "maxRetries": 2,
        "waitBetweenRetries": 5000
      },
      "id": "http-request",
      "name": "Call Notification Cleanup",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [450, 300],
      "credentials": {
        "httpHeaderAuth": {
          "id": "CREDENTIAL_ID",
          "name": "Ink37 Cron Auth"
        }
      }
    }
  ],
  "connections": {
    "Daily 3AM CT": {
      "main": [[{ "node": "Call Notification Cleanup", "type": "main", "index": 0 }]]
    }
  },
  "settings": { "executionOrder": "v1", "timezone": "America/Chicago" },
  "tags": [{ "name": "ink37" }, { "name": "cron" }]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `string === string` for secret comparison | `crypto.timingSafeEqual` with HMAC normalization | Always been the recommendation; widely adopted post-2020 | Eliminates timing side-channel on secret comparison |
| `redis.del(key)` for lock release | Lua script check-and-delete | Redis distributed locks pattern documented since 2014 | Prevents cross-process lock deletion race condition |
| `parseInt()` at runtime | `z.coerce.number()` in env schema | Zod coerce available since Zod 3.20 (2023) | Fails fast at startup instead of silently producing NaN |
| `DELETE ... RETURNING` for counts | `DELETE` + use `rowCount` from result metadata | Always available in PostgreSQL; Neon driver exposes it | Eliminates unnecessary data transfer |

**Note on @upstash/lock:** v0.2.1 (July 2024) is the latest release. It explicitly states it should NOT be used for correctness guarantees. The hand-rolled Lua pattern is more appropriate for this use case.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test -- --reporter=verbose` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRON-SEC-01 | Timing-safe token comparison rejects bad tokens, accepts good tokens | unit | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "timing-safe"` | Wave 0 |
| CRON-SEC-02 | Lock stores UUID, release only deletes if value matches | unit | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "lock"` | Wave 0 |
| CRON-ROB-01 | Non-numeric env vars rejected at startup | unit | `bun run test -- src/__tests__/env.test.ts -t "notification retention"` | Extend existing |
| CRON-ROB-02 | Purge SQL uses rowCount without RETURNING | unit (mock verify) | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "rowCount"` | Wave 0 |
| CRON-ROB-03 | purgeOldNotifications has auth bypass documentation | code review | manual | N/A |
| CRON-CLEAN-01 | Single Redis client shared across lock functions | unit (mock verify) | `bun run test -- src/__tests__/api-cron-cleanup.test.ts -t "Redis client"` | Wave 0 |
| CRON-CLEAN-02 | Env schema coerces number fields | unit | `bun run test -- src/__tests__/env.test.ts -t "coerce"` | Extend existing |
| CRON-INFRA-01 | n8n workflow JSON valid | file existence | manual (import to n8n) | N/A |

### Sampling Rate

- **Per task commit:** `bun run test -- src/__tests__/api-cron-cleanup.test.ts src/__tests__/env.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/api-cron-cleanup.test.ts` -- new test file for notification cleanup cron route (covers CRON-SEC-01, CRON-SEC-02, CRON-ROB-02, CRON-CLEAN-01)
- [ ] Extend `src/__tests__/env.test.ts` with tests for notification retention coerced fields (covers CRON-ROB-01, CRON-CLEAN-02)

## Open Questions

1. **Should the timing-safe fix be applied to all three cron routes?**
   - What we know: balance-due and no-show-followup routes have the identical `authHeader !== \`Bearer \${secret}\`` pattern.
   - What's unclear: Whether the PR scope includes fixing all routes or just the notifications-cleanup route.
   - Recommendation: Fix all three. The vulnerability is identical and the fix is a shared utility function. Extract `verifyCronAuth(request)` to a shared module.

2. **Should the shared Redis client be a module-level singleton or passed as parameter?**
   - What we know: The Upstash REST Redis client is stateless (HTTP-based), so a singleton is safe. The rate-limiter already uses a single `new Redis()` per module.
   - Recommendation: Create a `getRedis()` helper that returns a cached instance. Pass it to lock functions as a parameter for testability.

## Project Constraints (from CLAUDE.md)

- **Package manager:** bun (never npm/yarn/pnpm)
- **ORM:** Drizzle ORM 0.45.1 with `@neondatabase/serverless`
- **Env validation:** Zod schema in `src/lib/env.ts` with empty-string stripping
- **Logging:** Pino structured logging via `src/lib/logger.ts`
- **n8n:** Self-hosted at n8n.thehudsonfam.com for scheduled workflows (not Vercel Cron)
- **Server-only:** DAL functions import `server-only`; cron routes are route handlers (no server-only needed)
- **Drizzle import convention:** `db` from `@/lib/db`, schema from `@/lib/db/schema`

## Sources

### Primary (HIGH confidence)
- Node.js crypto docs (`nodejs.org/api/crypto.html`) -- timingSafeEqual API, Buffer requirements, RangeError on length mismatch
- Redis.io distributed locks (`redis.io/docs/latest/develop/clients/patterns/distributed-locks/`) -- Lua check-and-delete script, owner value pattern
- `@upstash/redis` 1.37.0 installed type definitions -- `eval(script, keys[], args[])` method signature verified from `node_modules/@upstash/redis/error-8y4qG0W2.d.ts:4241`
- `@neondatabase/serverless` 1.0.2 installed type definitions -- `QueryResult.rowCount: number` verified from `node_modules/@neondatabase/serverless/index.d.ts:277`
- Zod 4.3.6 official API docs (`zod.dev/api`) -- `z.coerce.number()` behavior
- Local runtime verification -- tested `z.coerce.number().int().positive().optional()` and `crypto.timingSafeEqual` patterns in project Node.js environment

### Secondary (MEDIUM confidence)
- Upstash blog (`upstash.com/blog/lock`) -- @upstash/lock v0.2.1 limitations documented; "Do not use for correctness guarantees"
- Simon Willison's TIL (`til.simonwillison.net/node/constant-time-compare-strings`) -- HMAC approach for normalizing string lengths before timingSafeEqual
- Zod GitHub Issue #2461 -- `z.coerce.number()` empty string to 0 edge case documented

### Tertiary (LOW confidence)
- None -- all findings verified against installed packages and official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed; APIs verified from type definitions
- Architecture: HIGH -- patterns verified with working Node.js code in this project environment
- Pitfalls: HIGH -- each pitfall reproduced locally (timingSafeEqual length error, Zod coerce empty string, etc.)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days -- stable patterns, no fast-moving dependencies)
