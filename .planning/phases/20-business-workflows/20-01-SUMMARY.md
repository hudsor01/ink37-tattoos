---
phase: 20-business-workflows
plan: 01
subsystem: schema, dal, email, auth
tags: [consent, email-templates, schema-migration, portal-hardening]
dependency_graph:
  requires: []
  provides: [consent-dal, consent-schema, email-templates, cron-secret-env]
  affects: [portal-actions, auth-hooks]
tech_stack:
  added: []
  patterns: [parameterized-auth-guard, transactional-version-creation, configurable-email-templates]
key_files:
  created:
    - src/lib/dal/consent.ts
    - src/lib/actions/consent-actions.ts
    - src/__tests__/consent-schema.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/env.ts
    - src/lib/auth.ts
    - src/lib/security/validation.ts
    - src/lib/actions/portal-actions.ts
    - src/lib/email/templates.ts
    - src/lib/email/resend.ts
decisions:
  - Parameterized auth guard (requireStaff option) on getActiveConsentForm instead of duplicating the function
  - escapeHtml utility local to templates.ts for XSS safety in email templates
  - Resend SDK uses contentType (not content_type) for attachment MIME type
metrics:
  duration: 5m 45s
  completed: 2026-03-30T07:01:15Z
  tasks: 2
  files: 10
---

# Phase 20 Plan 01: Business Workflow Foundation Summary

Consent form schema with versioned DAL, 4 email templates with Resend senders (including PDF attachments), CRON_SECRET env registration, and portal onboarding hardening with userId conflict handling.

## What Was Built

### Task 1: Schema Migration + Consent DAL + Env + Auth Hardening
**Commit:** `c8ee0e9`

- **Schema**: Added `consentForm` table (id, version, title, content, isActive, timestamps) and `consentFormRelations` export. Added `consentFormVersion` (integer nullable) and `consentExpiresAt` (timestamp nullable) to `tattooSession`.
- **Consent DAL** (`src/lib/dal/consent.ts`): 5 functions with parameterized auth:
  - `getConsentForms()` -- all versions, staff-only
  - `getActiveConsentForm({ requireStaff? })` -- single active form; defaults to staff check, portal uses `{ requireStaff: false }`
  - `getConsentFormsByCustomer(customerId)` -- session consent data per customer
  - `getSignedConsentsWithExpiration(filters)` -- paginated with active/expired/pending status
  - `createConsentFormVersion({ title, content })` -- transactional: deactivates old, inserts new version
- **Consent Actions** (`src/lib/actions/consent-actions.ts`): `createConsentFormVersionAction` and `deactivateConsentFormAction` with admin role check and audit logging
- **Validation**: `ConsentFormSchema` (title min 1 max 200, content min 10)
- **Env**: `CRON_SECRET` registered as `z.string().optional()` in env schema
- **Auth Hardening**: Inner try/catch around `db.update` for userId linking catches unique constraint violations with specific diagnostic logging
- **Portal Actions**: `signConsentAction` now sets `consentFormVersion` (via `getActiveConsentForm({ requireStaff: false })`) and `consentExpiresAt` (1 year from signing)
- **Tests**: 9 TDD tests covering schema exports, validation rules, and env schema

### Task 2: Email Templates + Resend Sender Functions
**Commit:** `8ba4d06`

- **Templates** (`src/lib/email/templates.ts`): 4 new functions:
  - `aftercareTemplate` -- configurable via optional `template` param with `{name}`, `{date}`, `{placement}` substitution; default template has full aftercare instructions
  - `balanceDueReminderTemplate` -- shows design, total cost, paid amount, remaining balance
  - `noShowFollowUpTemplate` -- friendly missed appointment message with reschedule options
  - `invoiceEmailTemplate` -- invoice number, amount due, references attached PDF
- **Senders** (`src/lib/email/resend.ts`): 4 new exports:
  - `sendAftercareEmail` -- subject: "Aftercare Instructions - Ink 37 Tattoos"
  - `sendBalanceDueReminder` -- subject: "Balance Due Reminder - Ink 37 Tattoos"
  - `sendNoShowFollowUp` -- subject: "We missed you - Ink 37 Tattoos"
  - `sendInvoiceEmail` -- subject: "Invoice {number} - Ink 37 Tattoos", with PDF attachment via Resend `attachments` array
- All senders guard on `RESEND_API_KEY` availability
- XSS protection via local `escapeHtml` utility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resend SDK attachment content_type property name**
- **Found during:** Task 2
- **Issue:** Plan specified `content_type: 'application/pdf'` but Resend SDK uses `contentType`
- **Fix:** Changed to `contentType: 'application/pdf'`
- **Files modified:** src/lib/email/resend.ts
- **Commit:** 8ba4d06

## Decisions Made

1. **Parameterized auth guard** on `getActiveConsentForm` -- single function serves both admin (default `requireStaff: true`) and portal (explicit `requireStaff: false`), avoiding code duplication
2. **Local escapeHtml** in templates.ts -- keeps email templates self-contained without importing from receipt-template (which does not exist in codebase)
3. **Resend contentType** (not content_type) -- matches actual Resend SDK TypeScript types

## Verification Results

- TypeScript: zero errors (`npx tsc --noEmit` clean)
- Tests: 40 passing (9 new consent tests + 31 existing)
- All 36 behavioral grep checks PASS (22 Task 1 + 14 Task 2)

## Known Stubs

None -- all functions are fully implemented with real logic.

## Self-Check: PASSED

All 7 created/modified files verified on disk. Both commit hashes (c8ee0e9, 8ba4d06) confirmed in git log.
