---
phase: 20
reviewers: [gemini, qwen]
reviewed_at: 2026-03-30T14:00:00.000Z
plans_reviewed: [20-01-PLAN.md, 20-02-PLAN.md, 20-03-PLAN.md]
---

# Cross-AI Plan Review — Phase 20

## Consensus Concerns

1. **Consent form public query workaround (Qwen HIGH)** — `getActiveConsentFormPublic()` creates duplication. Better: make `getActiveConsentForm()` accept optional `requireStaff` param, or just require any authenticated user (not staff) since consent forms are for portal users to sign.
2. **Missing consentForm relations export (Qwen MEDIUM)** — Drizzle requires explicit relations export. Must add `consentFormRelations`.

## Agreed Strengths
- Correct balance-due calculation using SQL SUM on payments (not session.paidAmount) (both)
- aftercareProvided idempotency guard (both)
- Inline PDF generation avoids internal HTTP fetch (both)
- n8n Bearer auth is standard secure pattern (both)
- 48-hour sliding window for no-show prevents re-emailing history (both)
- Consent versioning approach is lightweight and correct (both)

## Risk Assessment
- Gemini: LOW
- Qwen: LOW (with minor refinements)
- Both approve
