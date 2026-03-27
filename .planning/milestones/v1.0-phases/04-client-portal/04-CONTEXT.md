# Phase 4: Client Portal - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Clients have a self-service authenticated experience where they can view their tattoo journey — appointments, designs, consent forms, payment history — linked to their existing customer records in the admin system. No client-initiated payments (view receipts only). No booking from portal (Cal.com embed on public site handles that).

</domain>

<decisions>
## Implementation Decisions

### Account Linking
- **D-01:** Auto-link by email match on registration — when a new user registers via Better Auth, if their email matches an existing Customer.email, set Customer.userId to the new User.id automatically
- **D-02:** If no Customer match on registration, create a new Customer record with the user's name and email — don't block registration
- **D-03:** No admin invitation flow in this phase — clients self-register, admin creates Customer records in dashboard as before
- **D-04:** Clients can update their own profile (name, phone, address) but NOT medical info — medical info stays admin-only
- **D-05:** Registration page at `/register` in the `(auth)` route group, shared with existing `/login`

### Consent Forms
- **D-06:** Inline HTML consent form with acknowledgment checkbox and digital signature (typed name + timestamp) — not PDF generation
- **D-07:** Extend TattooSession with `consentSignedAt: DateTime?` and `consentSignedBy: String?` fields — no separate ConsentForm model
- **D-08:** Consent can be signed before the appointment — that's the primary use case (client signs in advance via portal)
- **D-09:** Consent form content at Claude's discretion — standard tattoo studio consent (health risks, allergies, aftercare, age verification, release of liability)
- **D-10:** Once signed, consent is read-only — cannot be unsigned by client (admin can reset if needed)

### Portal Layout & Navigation
- **D-11:** Simple horizontal nav/tabs at top — lighter feel than admin sidebar, appropriate for 4-page portal
- **D-12:** 4 pages: Overview (dashboard), Appointments, My Tattoos (designs + sessions combined), Payments
- **D-13:** Overview shows: next upcoming appointment, most recent payment, quick links to other sections
- **D-14:** Mobile responsive — tabs scroll horizontally on small screens
- **D-15:** Portal layout gets its own styled header with user name and logout — distinct from public site and admin

### Data Visibility
- **D-16:** Pricing: clients see total cost, deposit paid, balance remaining — NOT hourly rate or estimated hours
- **D-17:** Admin notes are internal only — never shown to clients
- **D-18:** Medical info not visible to clients — managed by admin only
- **D-19:** Clients can view their tattoo designs with images but cannot download original files — protects artist IP
- **D-20:** Payment history shows same receipt links (Stripe-hosted) as admin — per Phase 3 D-16

### Auth & Middleware
- **D-21:** New `requirePortalAuth` DAL helper — checks session exists and user has linked Customer record; redirects to login if not authenticated
- **D-22:** Middleware updated to protect `/portal` routes same as `/dashboard` — redirect to login if no session
- **D-23:** Portal users have role `user` (Better Auth default) — distinct from staff/admin roles; portal DAL functions only query data belonging to the authenticated user's linked Customer

### Claude's Discretion
- Portal visual design and branding consistency with public site
- Exact consent form content wording
- Appointment card/list design
- Empty state messages for new users with no history
- Error handling for unlinked accounts (user exists but no Customer)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & User Model
- `src/lib/auth.ts` — Better Auth server config; USER default role, email/password enabled
- `src/lib/auth-client.ts` — Better Auth client setup
- `src/middleware.ts` — Currently only protects /dashboard; needs /portal protection added

### Schema & Data Layer
- `prisma/schema.prisma` — Customer model (lines 97-132) has userId?: String @unique for linking; TattooSession (lines 173-204) has consentSigned Boolean
- `src/lib/dal/customers.ts` — Existing DAL with requireStaffRole; portal needs separate auth pattern
- `src/lib/dal/payments.ts` — Payment DAL with getPayments, getPaymentStats
- `src/lib/dal/sessions.ts` — Session DAL with session queries
- `src/lib/dal/appointments.ts` — Appointment DAL

### Portal Route Group
- `src/app/(portal)/layout.tsx` — Placeholder layout from Phase 1
- `src/app/(portal)/portal/page.tsx` — Placeholder page from Phase 1

### Phase 3 Payment Integration
- `src/app/(dashboard)/dashboard/payments/columns.tsx` — Receipt link column pattern to reuse
- `src/lib/dal/payments.ts` — getPayments with receiptUrl includes

### Project Requirements
- `.planning/REQUIREMENTS.md` — PORT-01 through PORT-06 define portal requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Better Auth** (`src/lib/auth.ts`): Email/password registration already enabled; USER role default
- **Shadcn UI components** (`src/components/ui/`): Button, Card, Input, Dialog — reuse for portal UI
- **StatusBadge** (`src/components/dashboard/status-badge.tsx`): Reuse for appointment and payment statuses
- **Payment receipt pattern** (`columns.tsx`): Receipt link with ExternalLink icon — reuse in portal
- **Email templates** (`src/lib/email/templates.ts`): Could add registration welcome email

### Established Patterns
- DAL with `requireStaffRole` — portal needs new `requirePortalAuth` that checks user→Customer link
- Server Actions with Zod validation for mutations (consent signing)
- Customer.userId unique constraint enables 1:1 User↔Customer linking
- Customer.email unique constraint enables email-based auto-linking

### Integration Points
- `(portal)` route group layout needs real header with navigation
- Middleware matcher needs `/portal/:path*` added
- Customer model needs no schema changes (userId FK already exists)
- TattooSession needs 2 new fields: consentSignedAt, consentSignedBy
- Registration flow links to `/login` (auth route group)
- Portal DAL functions filter by authenticated user's Customer.id

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The portal should feel polished and client-friendly, distinct from the admin dashboard's data-heavy interface.

</specifics>

<deferred>
## Deferred Ideas

- Client-initiated payments from portal (pay deposit/balance directly) — could be added later but not in PORT-05 scope (view only)
- Client booking from portal (currently uses Cal.com on public site) — separate enhancement
- Client message/chat with artist — out of scope per PROJECT.md
- Appointment reminders via email/SMS — MKT-02 in v2 roadmap
- Client design approval workflow — ENH-05 in v2 roadmap

</deferred>

---

*Phase: 04-client-portal*
*Context gathered: 2026-03-21*
