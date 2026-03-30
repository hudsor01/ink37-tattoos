---
phase: 20-business-workflows
plan: 02
subsystem: api, email, ui
tags: [cron, n8n, aftercare, balance-due, no-show, deposit-config, resend]
dependency_graph:
  requires:
    - phase: 20-01
      provides: email templates, Resend sender functions, CRON_SECRET env
  provides:
    - n8n-callable balance-due reminder cron endpoint
    - n8n-callable no-show follow-up cron endpoint
    - aftercare email trigger on session COMPLETED status
    - deposit configuration per appointment type in settings UI
  affects: [settings, sessions, cron-scheduling, n8n-workflows]
tech_stack:
  added: []
  patterns: [bearer-auth-cron-routes, after-callback-email-trigger, json-settings-config]
key_files:
  created:
    - src/app/api/cron/balance-due/route.ts
    - src/app/api/cron/no-show-followup/route.ts
  modified:
    - src/lib/actions/session-actions.ts
    - src/app/(dashboard)/dashboard/settings/settings-page-client.tsx
key-decisions:
  - "Balance calculation uses SUM of COMPLETED payments from payment table, not session.paidAmount (pitfall 4)"
  - "No-show 48-hour window uses Date.now() subtraction to prevent re-emailing historical no-shows"
  - "Aftercare trigger in both updateSessionAction and updateSessionFieldAction for form and inline edit paths"
  - "Deposit config stored as JSON object with appointment type keys in settings table"
patterns-established:
  - "Bearer auth cron pattern: verify CRON_SECRET env, return 500 if missing, 401 if mismatch"
  - "after() callback for non-blocking email: send email, then update DB flag for idempotency"
  - "JSON settings pattern: getJson helper for typed object settings with defaults"
requirements-completed: [BIZ-01, BIZ-03, BIZ-04]
metrics:
  duration: 5m
  completed: 2026-03-30
  tasks: 2
  files: 4
---

# Phase 20 Plan 02: Business Workflow Automation Summary

**n8n-callable cron routes for balance-due reminders and no-show follow-up with Bearer auth, aftercare email trigger on session COMPLETED with idempotency guard, and per-appointment-type deposit config UI in settings.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T07:07:45Z
- **Completed:** 2026-03-30T07:12:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Two n8n-callable cron API routes with Bearer auth and structured JSON responses
- Balance-due route calculates true balance from payment table SUM (not session.paidAmount)
- No-show route limited to 48-hour window via Date.now() subtraction preventing historical re-emails
- Aftercare email triggers on session COMPLETED in both form update and inline edit paths
- Aftercare idempotent via aftercareProvided flag check + mark-true after send
- Deposit configuration per appointment type in Settings Payment tab with JSON storage

## Task Commits

Each task was committed atomically:

1. **Task 1: n8n cron routes (balance-due + no-show) with Bearer auth** - `36cd148` (feat)
2. **Task 2: Aftercare email trigger + deposit config UI in settings** - `a7163ec` (feat)

## Files Created/Modified
- `src/app/api/cron/balance-due/route.ts` - n8n-callable endpoint scanning sessions with outstanding balances, sends reminders via Resend
- `src/app/api/cron/no-show-followup/route.ts` - n8n-callable endpoint scanning NO_SHOW appointments within 48h, sends follow-up via Resend
- `src/lib/actions/session-actions.ts` - Added aftercare email trigger on COMPLETED status in both updateSessionAction and updateSessionFieldAction
- `src/app/(dashboard)/dashboard/settings/settings-page-client.tsx` - Added deposit_config per appointment type in Payment Config tab

## Decisions Made

1. **Balance from payment SUM** -- Per research pitfall 4, the balance-due route uses SQL `SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END)` from the payment table rather than trusting session.paidAmount, ensuring accurate balance even if payments are partially processed.
2. **48-hour window with Date.now()** -- The no-show follow-up uses `new Date(Date.now() - 48 * 60 * 60 * 1000)` as cutoff so each cron run only processes recent no-shows, not the entire history.
3. **Dual aftercare triggers** -- Added aftercare trigger to both `updateSessionAction` (form-based update) and `updateSessionFieldAction` (inline edit), ensuring the email fires regardless of which UI path sets status to COMPLETED.
4. **JSON deposit config** -- Per-appointment-type deposit percentages stored as a JSON object in the settings table under key `deposit_config`, with defaults matching plan (CONSULTATION: 0, TATTOO_SESSION: 25, etc.).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing getCurrentSession import in session-actions.ts**
- **Found during:** Task 2
- **Issue:** `updateSessionFieldAction` referenced `getCurrentSession` but it was not imported (pre-existing issue from prior phase)
- **Fix:** Added `getCurrentSession` to the imports from `@/lib/auth`
- **Files modified:** src/lib/actions/session-actions.ts
- **Committed in:** a7163ec (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added status to ALLOWED_INLINE_FIELDS**
- **Found during:** Task 2
- **Issue:** `updateSessionFieldAction` had `status` not in `ALLOWED_INLINE_FIELDS`, meaning inline status edit to COMPLETED would be rejected before aftercare trigger could fire
- **Fix:** Added `'status'` to the `ALLOWED_INLINE_FIELDS` array
- **Files modified:** src/lib/actions/session-actions.ts
- **Committed in:** a7163ec (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for aftercare trigger to function via inline edit path. No scope creep.

## Issues Encountered

- **Notification table not in schema:** The `notification` table referenced by `createNotificationForAdmins` in `src/lib/dal/notifications.ts` is not defined in `src/lib/db/schema.ts` (pre-existing from Phase 17). The no-show route imports and calls `createNotificationForAdmins` wrapped in try/catch so the cron job works even if the notification table is not yet migrated. The TS error in `notifications.ts` itself is pre-existing and out of scope.

## Known Stubs

None -- all functions are fully implemented with real logic.

## User Setup Required

None - no external service configuration required. n8n workflow scheduling on `n8n.thehudsonfam.com` is managed separately.

## Next Phase Readiness
- Plan 03 (invoice generation + portal onboarding) can proceed
- Cron routes ready for n8n workflow configuration
- Aftercare template configurable via Settings Email Templates tab (created in Phase 19)
- Deposit config available in Settings Payment Config tab

## Self-Check: PASSED

All 4 created/modified files verified on disk. Both commit hashes (36cd148, a7163ec) confirmed in git log.

---
*Phase: 20-business-workflows*
*Completed: 2026-03-30*
