# Phase 4: Client Portal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-21
**Phase:** 04-client-portal
**Areas discussed:** Account linking, Consent form experience, Portal layout and navigation, Data visibility boundaries
**Mode:** Auto (--auto flag, all recommended defaults selected)

---

## Account Linking

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-link by email match | Match User.email to Customer.email on registration | Y |
| Admin invitation flow | Admin sends invite link to client | |
| Manual linking | Admin manually links accounts in dashboard | |

**User's choice:** [auto] Auto-link by email match on registration
**Notes:** Customer.email is unique in schema, simplest correct approach. If no match, create new Customer record.

---

## Consent Form Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Inline HTML consent with checkbox | Display form inline, checkbox + typed name + timestamp | Y |
| PDF generation and signing | Generate PDF, e-signature capture | |
| Third-party e-sign integration | DocuSign/HelloSign embed | |

**User's choice:** [auto] Inline HTML consent form
**Notes:** Simpler than PDF, legally sufficient for tattoo studios. Extend TattooSession with consentSignedAt/consentSignedBy fields.

---

## Portal Layout and Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal tabs/nav | Simple top navigation, lighter than sidebar | Y |
| Sidebar navigation | Consistent with admin dashboard | |
| Card-based overview only | Single page with expandable sections | |

**User's choice:** [auto] Simple horizontal nav/tabs
**Notes:** 4 pages (Overview, Appointments, My Tattoos, Payments). Lighter feel appropriate for client-facing portal.

---

## Data Visibility Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Totals only | Show total cost, deposit, balance — hide rates | Y |
| Full transparency | Show hourly rate, estimated hours, all details | |
| Configurable per client | Admin controls what each client can see | |

**User's choice:** [auto] Totals only — hide hourly rate and estimated hours
**Notes:** Admin notes hidden. Medical info admin-only. Design images viewable but not downloadable.

---

## Claude's Discretion

- Portal visual design and branding
- Consent form content wording
- Appointment card/list design
- Empty state messages
- Error handling for unlinked accounts

## Deferred Ideas

- Client-initiated payments from portal
- Client booking from portal
- Client message/chat with artist
- Appointment reminders
- Design approval workflow
