---
phase: 26-assets-infrastructure
plan: 03
subsystem: infra
tags: [n8n, cron, env-vars, documentation, workflows]

# Dependency graph
requires:
  - phase: 26-01
    provides: "Cron route handlers (balance-due, no-show-followup) that need external scheduling"
  - phase: 24-01
    provides: "Sentry integration that added SENTRY_DSN/SENTRY_ORG/SENTRY_PROJECT env vars"
provides:
  - "Importable n8n workflow JSON files for balance-due and no-show cron scheduling"
  - "Comprehensive ENV_VARS.md documenting all 19 Zod-validated environment variables"
  - "Vercel Dashboard Checklist for production deployment verification"
affects: [27-documentation, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: ["n8n Schedule Trigger with property-based format (triggerAtHour/triggerAtMinute) over cronExpression"]

key-files:
  created:
    - "n8n/balance-due-workflow.json"
    - "n8n/no-show-followup-workflow.json"
    - "n8n/README.md"
    - "docs/ENV_VARS.md"
  modified: []

key-decisions:
  - "Used n8n property-based schedule format (triggerAtHour/triggerAtMinute) instead of cronExpression for modern n8n compatibility"
  - "Categorized env vars into Required / Production-Critical Optional / Optional tiers based on Zod schema and runtime impact"
  - "Documented CRON_SECRET as production-critical despite being Zod-optional because cron endpoints return 500 without it"

patterns-established:
  - "n8n workflow pattern: Schedule Trigger -> HTTP Request with httpHeaderAuth Bearer token, retryOnFail, America/Chicago timezone"
  - "Env var documentation pattern: three-tier categorization (required/production-critical/optional) with Vercel deployment checklist"

requirements-completed: [INFRA-01, INFRA-04]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 26 Plan 03: n8n Cron Workflows and Environment Variable Documentation Summary

**n8n workflow JSONs for balance-due (daily 8AM CT) and no-show (hourly) cron scheduling, plus comprehensive ENV_VARS.md documenting all 19 Zod-validated production environment variables**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-31T19:16:07Z
- **Completed:** 2026-03-31T19:31:51Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Created importable n8n workflow JSON files for both cron endpoints with modern triggerAtHour/triggerAtMinute format, retryOnFail, and America/Chicago timezone
- Documented all 19 Zod-validated env vars in ENV_VARS.md with three-tier categorization (required / production-critical optional / optional)
- Added Vercel Dashboard Checklist with 19 checkboxes for deployment verification
- Documented 3 build-time-only variables (SENTRY_ORG/PROJECT/AUTH_TOKEN) not in Zod schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Create n8n workflow JSON files and README** - `27231c4` (feat)
2. **Task 2: Create production environment variable documentation** - `e4a0232` (docs)

## Files Created/Modified
- `n8n/balance-due-workflow.json` - Importable n8n workflow for daily 8 AM CT balance-due reminder emails
- `n8n/no-show-followup-workflow.json` - Importable n8n workflow for hourly no-show follow-up emails
- `n8n/README.md` - Import instructions, credential setup, retry config, testing guidance
- `docs/ENV_VARS.md` - Production environment variable documentation with Vercel checklist

## Decisions Made
- Used property-based n8n schedule format (`triggerAtHour`/`triggerAtMinute`) instead of `cronExpression` -- addresses MEDIUM review concern about format conflict with modern n8n Schedule Trigger
- Categorized CRON_SECRET, RESEND_API_KEY, and Upstash vars as "Production-Critical Optional" -- Zod-optional but breaking in production, deserves separate callout per Claude LOW review concern
- Documented SENTRY_ORG/PROJECT/AUTH_TOKEN as "Additional Vercel/Build Variables" since they are consumed by next.config.ts Sentry plugin at build time but are not in the runtime Zod schema

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration:**
- Import n8n workflows at https://n8n.thehudsonfam.com (see `n8n/README.md` for steps)
- Create HTTP Header Auth credential "Ink37 Cron Auth" in n8n with CRON_SECRET as Bearer token
- Set all env vars in Vercel Dashboard per `docs/ENV_VARS.md` checklist

## Next Phase Readiness
- n8n workflows ready for import once CRON_SECRET is configured in both Vercel and n8n
- ENV_VARS.md ready for reference during production deployment (Phase 27 documentation)
- All infrastructure requirements (INFRA-01, INFRA-04) complete

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 26-assets-infrastructure*
*Completed: 2026-03-31*
