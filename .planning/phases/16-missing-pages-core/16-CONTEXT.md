# Phase 16: Missing Pages — Core - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build 4 dashboard capabilities: artist profile page, visual appointment calendar (day/week/month), gift card management (list/issue/deactivate), and enhance the existing contacts page (search, pagination, admin notes, delete). All DAL functions exist from Phase 14. All UI foundation components exist from Phase 15. This phase is page construction and wiring.

</domain>

<decisions>
## Implementation Decisions

### Calendar View (PAGE-02)
- **D-01:** Use **FullCalendar** (`@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid` + `@fullcalendar/interaction`). Day/week/month views. Renders from local appointments table (not Cal.com API — Cal.com is for public booking only).
- **D-02:** Appointments color-coded by status using the CSS variables from Phase 15 StatusBadge (`--status-confirmed`, `--status-pending`, etc.).
- **D-03:** Clicking an appointment opens a **Sheet** (slide-in panel) showing full details: customer name, date/time, type, status, notes, linked sessions. Edit and cancel action buttons in the sheet.
- **D-04:** Calendar data loads via server component calling `listAppointments()` DAL (with date range filter for visible period). Client component renders FullCalendar.

### Artist Profile Page (PAGE-01)
- **D-05:** Claude decides layout (single form vs tabbed). Fields: name, email, bio, specialties (JSON array), profileImage, instagramHandle, yearsExperience, isActive.
- **D-06:** Profile photo upload reuses the existing Vercel Blob upload pattern from the media page (upload/token API route).
- **D-07:** Uses `getArtistProfile()` and `updateArtistProfile()` from `src/lib/dal/artists.ts`.

### Gift Card Management (PAGE-05)
- **D-08:** List page with ResponsiveDataTable showing: code, initial balance, current balance, status (active/inactive/redeemed), purchaser email, recipient, created date.
- **D-09:** "Issue Gift Card" button opens a **Dialog** form with fields: amount, recipient email, recipient name (optional). Auto-generates code. Sends notification email via Resend.
- **D-10:** Deactivation uses **AlertDialog** confirmation: "This will prevent the card from being used. Remaining balance: $X." Sets isActive=false.
- **D-11:** Uses `getGiftCards()`, `createGiftCard()` from `src/lib/dal/gift-cards.ts`. Need to add `deactivateGiftCard()` DAL function.

### Contacts Page Enhancement (PAGE-04)
- **D-12:** Wire pagination to `PaginatedResult` from contacts DAL. Add search input. Add status filter dropdown.
- **D-13:** Inline admin notes editing (click-to-edit pattern). Delete with AlertDialog.
- **D-14:** All patterns follow Phase 15 conventions (EmptyState, ResponsiveDataTable, FieldError, toast.promise, AlertDialog for destructive actions).

### Claude's Discretion
- Artist profile layout (single form vs tabbed)
- Calendar date range filter strategy (current month ± buffer)
- Gift card table column ordering and mobile card fields
- Contacts search field targeting (name, email, message)
- FullCalendar theme integration with shadcn/Tailwind

</decisions>

<canonical_refs>
## Canonical References

### DAL (from Phase 14)
- `src/lib/dal/artists.ts` — `getArtistProfile()`, `updateArtistProfile()`
- `src/lib/dal/gift-cards.ts` — `getGiftCards()`, `createGiftCard()`, `validateGiftCard()`, `redeemGiftCard()`, `getGiftCardByCode()`
- `src/lib/dal/contacts.ts` — `getContacts()`, `updateContact()`, `deleteContact()`, `updateContactStatus()`, `createContact()`
- `src/lib/dal/appointments.ts` — `listAppointments()` (paginated), appointment CRUD

### Existing Pages
- `src/app/(dashboard)/dashboard/contacts/page.tsx` — Existing contacts page (needs enhancement)
- `src/app/(dashboard)/dashboard/contacts/contacts-client.tsx` — Client component with status updates
- `src/app/(dashboard)/dashboard/appointments/page.tsx` — Existing appointments list (calendar is a new view)

### UI Components (from Phase 15)
- `src/components/dashboard/empty-state.tsx` — EmptyState component
- `src/components/dashboard/responsive-data-table.tsx` — ResponsiveDataTable with mobile cards
- `src/components/dashboard/field-error.tsx` — FieldError for form validation
- `src/components/dashboard/date-picker.tsx` — DatePicker (Popover + Calendar)
- `src/components/dashboard/status-badge.tsx` — StatusBadge with CSS variables
- `src/hooks/use-unsaved-changes.ts` — useUnsavedChanges hook

### Upload Pattern
- `src/app/api/upload/token/route.ts` — Vercel Blob upload token route
- `src/app/(dashboard)/dashboard/media/media-page-client.tsx` — Reference for upload pattern

### Schema
- `src/lib/db/schema.ts` — tattooArtist table, giftCard table, contact table, appointment table

### Actions
- `src/lib/actions/contact-status-action.ts` — Existing contact status update action
- `src/lib/actions/safe-action.ts` — safeAction wrapper

### Theme
- `src/app/globals.css` — Status CSS variables (--status-confirmed, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All DAL functions created in Phase 14 (artists, gift-cards, contacts have full CRUD)
- All Phase 15 UI foundation components (EmptyState, ResponsiveDataTable, FieldError, etc.)
- Sonner toast.promise pattern established
- AlertDialog for destructive actions pattern established
- useUnsavedChanges hook for forms
- Vercel Blob upload pattern from media page

### Established Patterns
- Server component page → client component for interactivity
- safeAction wrapper for all mutations returning ActionResult<T>
- loading.tsx with layout-matched skeletons
- ResponsiveDataTable with mobileFields for mobile card views
- StatusBadge with CSS custom properties for status colors
- DynamicBreadcrumbs auto-generated from route

### What Needs Creating
- `/dashboard/profile/page.tsx` — New page
- `/dashboard/calendar/page.tsx` — New page
- `/dashboard/gift-cards/page.tsx` — New page
- `deactivateGiftCard()` DAL function
- `issueGiftCardAction()` server action
- `deactivateGiftCardAction()` server action
- `updateArtistProfileAction()` server action
- FullCalendar integration component
- Gift card issue Dialog form
- Admin notes inline editor for contacts

</code_context>

<specifics>
## Specific Ideas

- FullCalendar for calendar (not react-big-calendar)
- Sheet for appointment click (not page navigation)
- Dialog for gift card issuance
- AlertDialog for gift card deactivation
- Vercel Blob reuse for artist photo
- Contacts page is an enhancement, not a new build

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-missing-pages-core*
*Context gathered: 2026-03-29*
