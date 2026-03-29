# Phase 16: Missing Pages -- Core - Research

**Researched:** 2026-03-29
**Domain:** Dashboard page construction (calendar, profile, gift cards, contacts enhancement)
**Confidence:** HIGH

## Summary

Phase 16 is a page construction and wiring phase. All DAL functions exist from Phase 14, all UI foundation components exist from Phase 15, and the established patterns (server component page -> client component, safeAction wrapper, ResponsiveDataTable, toast.promise, AlertDialog for destructive actions) are well-documented and consistent across the codebase.

The primary new technology is FullCalendar (`@fullcalendar/react` v6.1.20) for the calendar view. This is a mature library with good React support, though it requires careful CSS integration with the existing shadcn/Tailwind theme. The remaining three pages (artist profile, gift cards, contacts enhancement) are standard CRUD pages that follow established patterns already in the codebase.

**Primary recommendation:** Build all four pages following the exact patterns established in Phase 15 (appointments list, customer form, media page). FullCalendar is the only new dependency and requires 4 packages. All other work is wiring existing DAL functions to existing UI components.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use FullCalendar (`@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid` + `@fullcalendar/interaction`). Day/week/month views. Renders from local appointments table (not Cal.com API).
- **D-02:** Appointments color-coded by status using CSS variables from Phase 15 StatusBadge (`--status-confirmed`, `--status-pending`, etc.).
- **D-03:** Clicking an appointment opens a Sheet (slide-in panel) showing full details: customer name, date/time, type, status, notes, linked sessions. Edit and cancel action buttons in the sheet.
- **D-04:** Calendar data loads via server component calling `listAppointments()` DAL (with date range filter for visible period). Client component renders FullCalendar.
- **D-05:** Claude decides layout (single form vs tabbed). Fields: name, email, bio, specialties (JSON array), profileImage, instagramHandle, yearsExperience, isActive.
- **D-06:** Profile photo upload reuses the existing Vercel Blob upload pattern from the media page (upload/token API route).
- **D-07:** Uses `getArtistProfile()` and `updateArtistProfile()` from `src/lib/dal/artists.ts`.
- **D-08:** Gift card list page with ResponsiveDataTable showing: code, initial balance, current balance, status (active/inactive/redeemed), purchaser email, recipient, created date.
- **D-09:** "Issue Gift Card" button opens a Dialog form with fields: amount, recipient email, recipient name (optional). Auto-generates code. Sends notification email via Resend.
- **D-10:** Deactivation uses AlertDialog confirmation: "This will prevent the card from being used. Remaining balance: $X." Sets isActive=false.
- **D-11:** Uses `getGiftCards()`, `createGiftCard()` from `src/lib/dal/gift-cards.ts`. Need to add `deactivateGiftCard()` DAL function.
- **D-12:** Wire pagination to `PaginatedResult` from contacts DAL. Add search input. Add status filter dropdown.
- **D-13:** Inline admin notes editing (click-to-edit pattern). Delete with AlertDialog.
- **D-14:** All patterns follow Phase 15 conventions (EmptyState, ResponsiveDataTable, FieldError, toast.promise, AlertDialog for destructive actions).

### Claude's Discretion
- Artist profile layout (single form vs tabbed)
- Calendar date range filter strategy (current month +/- buffer)
- Gift card table column ordering and mobile card fields
- Contacts search field targeting (name, email, message)
- FullCalendar theme integration with shadcn/Tailwind

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAGE-01 | Artist Profile page -- owner can edit bio, specialties, portfolio display preferences, business info, profile photo | `getArtistProfile()` and `updateArtistProfile()` DAL exist. `tattooArtist` table has name, email, phone, bio, specialties, hourlyRate, portfolio, isActive. Schema needs `profileImage`, `instagramHandle`, `yearsExperience` fields (or use existing fields). Vercel Blob upload pattern exists from media page. |
| PAGE-02 | Calendar view -- visual day/week/month calendar showing appointments with time slots, drag support optional | `getAppointmentsByDateRange()` DAL exists. FullCalendar v6.1.20 provides day/week/month views. Status CSS variables exist for color-coding. Sheet component exists for appointment detail panel. |
| PAGE-04 | Contacts management page -- list/filter/search submissions, update status, add admin notes, template responses | `getContacts()` with pagination/search exists. `updateContact()`, `deleteContact()`, `updateContactStatus()` DAL exist. Current page uses card layout (not ResponsiveDataTable) and lacks search/pagination/admin notes. |
| PAGE-05 | Gift card management page -- view all issued cards, check balances, issue new cards, deactivate cards | `getGiftCards()` with pagination/search exists. `createGiftCard()` exists. Need new `deactivateGiftCard()` DAL function. `sendGiftCardEmail()` and `sendGiftCardPurchaseConfirmationEmail()` Resend helpers exist. |

</phase_requirements>

## Standard Stack

### Core (New Dependency)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @fullcalendar/react | 6.1.20 | React wrapper for FullCalendar | Official React component; locked decision D-01 |
| @fullcalendar/core | 6.1.20 | FullCalendar core engine | Required peer dependency |
| @fullcalendar/daygrid | 6.1.20 | Month/day grid views | Locked decision D-01 |
| @fullcalendar/timegrid | 6.1.20 | Week/day time-slot views | Locked decision D-01 |
| @fullcalendar/interaction | 6.1.20 | Click/drag interaction | Required for eventClick callback |

### Already Installed (No Changes)
| Library | Purpose | Used For |
|---------|---------|----------|
| react-hook-form | Form state management | Artist profile form, gift card issue form |
| @hookform/resolvers | Zod integration | Form validation |
| zod | Schema validation | Server action input validation |
| @tanstack/react-query | Server state management | Calendar data fetching, cache invalidation |
| sonner | Toast notifications | All mutation feedback |
| date-fns | Date formatting | Calendar dates, contact timestamps |
| nuqs | URL state | Filter/search state in contacts page |
| resend | Email sending | Gift card notification emails |
| @vercel/blob | File uploads | Artist profile photo upload |
| lucide-react | Icons | All page icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FullCalendar | react-big-calendar | FullCalendar is locked decision; more mature, better view options |
| Sheet (appointment detail) | Page navigation | Sheet is locked decision D-03; better UX for quick view |
| Dialog (gift card form) | Separate page | Dialog is locked decision D-09; standard pattern for create forms |

**Installation:**
```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

**Version verification:** FullCalendar v6.1.20 confirmed via npm registry (published ~December 2025). All 5 packages must be the same major.minor version.

## Architecture Patterns

### New Pages Structure
```
src/app/(dashboard)/dashboard/
  profile/
    page.tsx                    # Server component -> fetches artist profile
    profile-client.tsx          # Client component -> form with RHF
    loading.tsx                 # Skeleton matching form layout
  calendar/
    page.tsx                    # Server component -> fetches date range appointments
    calendar-client.tsx         # Client component -> FullCalendar + Sheet
    loading.tsx                 # Skeleton matching calendar layout
  gift-cards/
    page.tsx                    # Server component -> fetches paginated gift cards
    gift-cards-client.tsx       # Client component -> ResponsiveDataTable + Dialog + AlertDialog
    loading.tsx                 # Skeleton matching table layout
  contacts/
    page.tsx                    # MODIFY: wire pagination, pass PaginatedResult
    contacts-client.tsx         # MODIFY: add search, pagination, notes, delete
    loading.tsx                 # EXISTS: already has skeleton
```

### Pattern 1: Server Component Page with Pagination
**What:** Server component fetches paginated data, passes to client component
**When to use:** Gift cards page, contacts page (enhancement)
**Example:**
```typescript
// Source: Existing pattern from appointments/page.tsx adapted for pagination
import { connection } from 'next/server';
import { getGiftCards } from '@/lib/dal/gift-cards';
import { GiftCardsClient } from './gift-cards-client';

export default async function GiftCardsPage() {
  await connection();
  const result = await getGiftCards();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gift Cards</h1>
        <p className="text-muted-foreground">Issue and manage gift cards.</p>
      </div>
      <GiftCardsClient initialData={result} />
    </div>
  );
}
```

### Pattern 2: Calendar Data Loading with Date Range
**What:** Server component loads initial month of appointments; client component re-fetches on navigation via TanStack Query
**When to use:** Calendar page only
**Key insight:** `getAppointmentsByDateRange(start, end)` already exists in the DAL and returns appointments with customer relation. The initial render uses server component data; subsequent date navigation uses client-side TanStack Query with a `queryFn` calling a Route Handler (or re-using the paginated DAL via search params).
**Recommendation:** Use a dedicated API route `/api/admin/calendar?start=X&end=Y` that calls `getAppointmentsByDateRange()` to support client-side date range fetches when the user navigates months.

### Pattern 3: FullCalendar Event Mapping
**What:** Map appointment records to FullCalendar Event Objects
**When to use:** Calendar page
**Example:**
```typescript
// Map appointments to FullCalendar events
function mapToCalendarEvents(appointments: Appointment[]): EventInput[] {
  return appointments.map((apt) => ({
    id: apt.id,
    title: `${apt.customer?.firstName ?? apt.firstName} ${apt.customer?.lastName ?? apt.lastName}`,
    start: new Date(apt.scheduledDate),
    end: apt.duration
      ? new Date(new Date(apt.scheduledDate).getTime() + apt.duration * 60000)
      : undefined,
    backgroundColor: `var(--status-${apt.status.toLowerCase().replace(/_/g, '-')})`,
    borderColor: `var(--status-${apt.status.toLowerCase().replace(/_/g, '-')})`,
    textColor: 'white',
    extendedProps: {
      appointmentId: apt.id,
      status: apt.status,
      type: apt.type,
      customerId: apt.customerId,
      customerName: `${apt.customer?.firstName ?? ''} ${apt.customer?.lastName ?? ''}`,
      notes: apt.notes,
    },
  }));
}
```

### Pattern 4: Server Action with Audit Logging
**What:** All mutations follow requireRole -> safeAction -> DAL call -> audit log -> revalidatePath
**When to use:** All new server actions (updateArtistProfile, issueGiftCard, deactivateGiftCard, updateContactNotes, deleteContact)
**Example:**
```typescript
// Source: Established pattern from contact-status-action.ts
export async function issueGiftCardAction(data: {
  amount: number;
  recipientEmail: string;
  recipientName?: string;
}): Promise<ActionResult<{ code: string }>> {
  const session = await requireRole('admin');

  return safeAction(async () => {
    const validated = IssueGiftCardSchema.parse(data);
    const result = await createGiftCard({
      initialBalance: validated.amount,
      purchaserEmail: session.user.email,
      recipientEmail: validated.recipientEmail,
      recipientName: validated.recipientName,
    });

    // Send email notification
    await sendGiftCardEmail({
      to: validated.recipientEmail,
      recipientName: validated.recipientName ?? 'Valued Customer',
      senderName: 'Ink 37 Tattoos',
      amount: validated.amount,
      code: result.code,
    });

    const hdrs = await headers();
    after(() => logAudit({...}));

    revalidatePath('/dashboard/gift-cards');
    return { code: result.code };
  });
}
```

### Pattern 5: Inline Click-to-Edit
**What:** Admin notes field that shows text/placeholder, clicking activates a Textarea, blur/enter saves
**When to use:** Contacts admin notes (D-13)
**Key implementation:**
```typescript
// Client-side inline editor
function InlineNotes({ contactId, initialNotes }: { contactId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes ?? '');
  const [isPending, startTransition] = useTransition();

  async function handleSave() {
    setEditing(false);
    if (value === (initialNotes ?? '')) return; // No change
    startTransition(() => {
      toast.promise(
        updateContactNotesAction(contactId, value),
        { loading: 'Saving notes...', success: 'Notes saved', error: 'Failed to save' }
      );
    });
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-left text-sm">
        {value || <span className="text-muted-foreground italic">Add notes...</span>}
      </button>
    );
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSave()}
      autoFocus
      className="text-sm"
    />
  );
}
```

### Artist Profile Layout Recommendation (Claude's Discretion)
**Recommendation: Single form (not tabbed)**
**Rationale:** The `tattooArtist` table has only ~10 fields (name, email, phone, bio, specialties, hourlyRate, portfolio, isActive, and the 2-3 new fields). This is far fewer fields than the customer form (which uses tabs for ~20+ fields). A single scrollable form with logical sections (Personal Info, Business Details, Social/Display) separated by headings or horizontal rules provides better UX for this small number of fields and avoids unnecessary navigation complexity.

### Calendar Date Range Strategy (Claude's Discretion)
**Recommendation: Fetch current view range + 1 week buffer on each side**
**Rationale:** FullCalendar's `datesSet` callback fires whenever the visible date range changes (month navigation, view switching). Use this callback to trigger TanStack Query with the new `start`/`end` range. Adding a 1-week buffer on each side prevents visible blank periods when transitioning between months (month view shows trailing/leading days from adjacent months).

### Gift Card Table Column Ordering (Claude's Discretion)
**Recommendation:** Code | Recipient | Initial Balance | Current Balance | Status | Created
**Mobile card fields:** Code, Recipient, Current Balance, Status

### Contacts Search Targeting (Claude's Discretion)
**Recommendation:** Use the existing `searchVector` (tsvector) which already indexes name (weight A), email (weight B), and message (weight C). The `getContacts()` DAL already uses `plainto_tsquery` for search. No changes needed to the DAL search implementation.

### Anti-Patterns to Avoid
- **Direct DB calls from components:** Always go through DAL functions with auth checks
- **FormData for JSON-heavy actions:** Use typed object parameters (not FormData) for actions like issueGiftCard that don't have file uploads
- **Fetching all appointments for calendar:** Use `getAppointmentsByDateRange()` with the visible date range, not `getAppointments()` which is paginated
- **CSS custom properties in inline styles for FullCalendar:** FullCalendar may not resolve CSS variables in inline `backgroundColor`. If so, resolve the CSS variable value at map time using `getComputedStyle()`, or use `classNames` array with status-specific CSS classes instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar rendering | Custom grid/time slot components | FullCalendar (locked decision) | Day/week/month views, event positioning, time slot layout are deceptively complex |
| Gift card codes | Custom random string generator | `generateGiftCardCode()` from `src/lib/store-helpers.ts` | Already exists and handles uniqueness format |
| Email delivery | Direct SMTP/fetch | `sendGiftCardEmail()` from `src/lib/email/resend.ts` | Already exists with proper Resend integration and error handling |
| File upload | Custom upload logic | Vercel Blob client upload via `/api/upload/token` route | Already exists with auth, file type, and size validation |
| Form validation | Manual checks | Zod schemas + react-hook-form + zodResolver | Established pattern, field-level errors, safeAction integration |
| Pagination UI | Custom pagination component | TanStack Table pagination (via DataTable) | Already integrated in ResponsiveDataTable |
| Status badges | Custom colored spans | `StatusBadge` component with CSS variables | Already handles all status strings with theme-aware colors |
| Empty states | Custom empty divs | `EmptyState` component | Already has icon, title, description, optional action pattern |

**Key insight:** This phase should produce zero new shared components. Every UI pattern needed already exists. The work is assembly and wiring.

## Common Pitfalls

### Pitfall 1: FullCalendar CSS Variable Colors in Inline Styles
**What goes wrong:** FullCalendar uses `backgroundColor` and `borderColor` as inline styles on event elements. CSS custom properties like `var(--status-confirmed)` may not resolve correctly in inline style attributes in all browsers/contexts.
**Why it happens:** The oklch color values are defined as CSS variables and may not interpolate correctly in JavaScript-set inline styles.
**How to avoid:** Two approaches: (1) Use `classNames` array on events with CSS classes that apply the status colors, OR (2) Use `eventContent` render hook to render a custom React element with Tailwind classes matching the StatusBadge pattern. Approach (2) gives the most control and reuses the existing StatusBadge CSS pattern.
**Warning signs:** Events appear with default blue color instead of status-specific colors.

### Pitfall 2: Contacts Page Currently Doesn't Use Pagination
**What goes wrong:** The current `contacts/page.tsx` calls `getContacts()` and maps the result as if it returns an array (line 8: `contacts.map(...)`) but `getContacts()` returns `PaginatedResult<T>`. This suggests the page was written before Phase 14 added pagination.
**Why it happens:** Phase 14 changed the DAL return type but the page wasn't updated.
**How to avoid:** The contacts page.tsx needs to be rewritten to handle `PaginatedResult` -- extract `.data` for the array, pass `.total`, `.page`, `.totalPages` to the client component.
**Warning signs:** TypeScript errors when trying to map `PaginatedResult` directly.

### Pitfall 3: Artist Profile Schema Fields May Not Exist
**What goes wrong:** Decision D-05 specifies fields like `profileImage`, `instagramHandle`, `yearsExperience` but the current `tattooArtist` table only has: id, name, email, phone, specialties, hourlyRate, isActive, portfolio, bio, createdAt, updatedAt.
**Why it happens:** The CONTEXT.md lists desired form fields that don't yet exist in the schema.
**How to avoid:** Either (a) add a Drizzle migration to add `profileImage`, `instagramHandle`, `yearsExperience` columns to `tattoo_artist`, or (b) map to existing columns (`portfolio[0]` as profile image, store Instagram in a notes-like field). Option (a) is cleaner. The `updateArtistProfile()` DAL function also needs to be updated to accept the new fields.
**Warning signs:** Drizzle type errors when trying to set fields that don't exist on the schema.

### Pitfall 4: FullCalendar datesSet Fires on Initial Render
**What goes wrong:** If `datesSet` callback triggers a data fetch, it fires on the initial render too, causing a double-fetch (server component data + client re-fetch).
**Why it happens:** FullCalendar calls `datesSet` when the calendar first renders with its initial date range.
**How to avoid:** Use a ref to skip the first `datesSet` call (since the server component already provided initial data), or use the server-provided data as the TanStack Query initial data and let the `datesSet` callback only update the query key (which will use the cached data on first render).
**Warning signs:** Unnecessary network requests on page load, flicker as data loads twice.

### Pitfall 5: Gift Card `deactivateGiftCard()` DAL Doesn't Exist
**What goes wrong:** The CONTEXT.md (D-11) explicitly notes "Need to add `deactivateGiftCard()` DAL function."
**Why it happens:** Phase 14 created the main CRUD functions but deactivation is a new operation.
**How to avoid:** Create `deactivateGiftCard(id: string)` in `src/lib/dal/gift-cards.ts` following the same pattern: `requireStaffRole()`, `db.update(...).set({ isActive: false }).where(eq(id)).returning()`, handle empty result.
**Warning signs:** Build error when the server action tries to import a non-existent function.

### Pitfall 6: Sidebar Navigation Missing New Pages
**What goes wrong:** The new pages (profile, calendar, gift-cards) won't be accessible from the sidebar navigation.
**Why it happens:** `admin-nav.tsx` has a hardcoded `navItems` array that doesn't include the new routes.
**How to avoid:** Update `src/components/dashboard/admin-nav.tsx` to add entries for Profile, Calendar, and Gift Cards. Use appropriate Lucide icons (User, CalendarDays, Gift).
**Warning signs:** Pages exist but users can't navigate to them.

## Code Examples

### FullCalendar React Integration with Status Colors
```typescript
// Source: FullCalendar docs (https://fullcalendar.io/docs/react)
'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg, EventInput } from '@fullcalendar/core';

interface CalendarClientProps {
  initialEvents: EventInput[];
}

export function CalendarClient({ initialEvents }: CalendarClientProps) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  function handleEventClick(info: EventClickArg) {
    const appointmentId = info.event.extendedProps.appointmentId;
    setSelectedAppointmentId(appointmentId);
  }

  function handleDatesSet(dateInfo: DatesSetArg) {
    // dateInfo.start and dateInfo.end are Date objects
    // Use these to fetch appointments for the visible range
  }

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={initialEvents}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        height="auto"
      />
      {/* Sheet for appointment detail */}
    </>
  );
}
```

### Vercel Blob Client Upload (Reuse Pattern)
```typescript
// Source: Existing pattern from src/app/(dashboard)/dashboard/media/media-page-client.tsx
import { upload } from '@vercel/blob/client';

async function handleProfilePhotoUpload(file: File) {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload/token',
  });
  return blob.url; // Store this URL in artist profile
}
```

### FullCalendar Custom Event Rendering with Status Colors
```typescript
// Use eventContent to render React JSX with status-aware styling
function renderEventContent(eventInfo: EventContentArg) {
  const status = eventInfo.event.extendedProps.status as string;
  return (
    <div className="flex items-center gap-1 overflow-hidden px-1 py-0.5">
      <StatusBadge status={status} className="shrink-0 text-[10px]" />
      <span className="truncate text-xs font-medium">
        {eventInfo.event.title}
      </span>
      {eventInfo.timeText && (
        <span className="text-xs opacity-75">{eventInfo.timeText}</span>
      )}
    </div>
  );
}
```

### Gift Card Computed Status Display
```typescript
// Derive display status from isActive and balance
function getGiftCardStatus(card: { isActive: boolean; balance: number; initialBalance: number }): string {
  if (!card.isActive) return 'Inactive';
  if (card.balance <= 0) return 'Redeemed';
  if (card.balance < card.initialBalance) return 'Partially Used';
  return 'Active';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-big-calendar | FullCalendar v6 | 2023 (v6 release) | Better TypeScript support, more view options, official React wrapper |
| FullCalendar v5 | FullCalendar v6 | 2023 | Simplified API, better bundling, CSS custom properties |
| Contacts as flat card list | Contacts with ResponsiveDataTable + pagination + search | Phase 16 | Scales to many contacts, matches other list pages |

**Deprecated/outdated:**
- FullCalendar v5 API: The `@fullcalendar/core` v5 had different import patterns. Use v6 imports.
- The current contacts page (calling `getContacts()` and treating result as array) is pre-Phase-14 code that needs updating.

## Open Questions

1. **Artist profile schema migration**
   - What we know: `tattooArtist` table lacks `profileImage`, `instagramHandle`, `yearsExperience` columns.
   - What's unclear: Whether to add these via a Drizzle migration or repurpose existing columns.
   - Recommendation: Add a Drizzle migration. This is a schema change but it's additive (new nullable columns) so it's safe and backward compatible. The migration should be the first task.

2. **Calendar API route for client-side date range fetching**
   - What we know: `getAppointmentsByDateRange()` DAL exists. The server component can provide initial data.
   - What's unclear: Whether to add a new API route `/api/admin/calendar` or use a different data fetching pattern.
   - Recommendation: Add a dedicated route handler. The existing pattern (appointments list) uses `/api/admin/appointments` for TanStack Query. Follow the same pattern with a calendar-specific endpoint that accepts `start` and `end` query params.

3. **FullCalendar CSS variable compatibility with oklch colors**
   - What we know: Status colors are defined using oklch() in CSS variables. FullCalendar accepts color strings.
   - What's unclear: Whether FullCalendar's inline style approach will correctly resolve CSS variables with oklch values.
   - Recommendation: Use `eventContent` render hook with React JSX and Tailwind classes (pattern shown above) instead of relying on FullCalendar's built-in `backgroundColor`/`borderColor` props. This gives full control over styling and reuses the StatusBadge pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAGE-01 | Artist profile update action validates input and calls DAL | unit | `npx vitest run src/__tests__/artist-profile-action.test.ts -x` | Wave 0 |
| PAGE-02 | Calendar maps appointments to FullCalendar events correctly | unit | `npx vitest run src/__tests__/calendar-event-mapping.test.ts -x` | Wave 0 |
| PAGE-04 | Contact notes update and delete actions work correctly | unit | `npx vitest run src/__tests__/contact-actions.test.ts -x` | Wave 0 |
| PAGE-05 | Gift card issue and deactivate actions validate input | unit | `npx vitest run src/__tests__/gift-card-admin-actions.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/artist-profile-action.test.ts` -- covers PAGE-01 server action
- [ ] `src/__tests__/calendar-event-mapping.test.ts` -- covers PAGE-02 event mapping logic
- [ ] `src/__tests__/contact-actions.test.ts` -- covers PAGE-04 notes update/delete actions (some contact tests may already exist)
- [ ] `src/__tests__/gift-card-admin-actions.test.ts` -- covers PAGE-05 issue/deactivate actions

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM 0.45.1 -- schema in `src/lib/db/schema.ts`, relational query API for reads, SQL builder for aggregations
- **Auth:** Better Auth with 5-tier RBAC
- **UI:** Shadcn/Radix + Tailwind CSS 4
- **Email:** Resend
- **Storage:** Vercel Blob
- **Architecture:** Server Actions for mutations, Route Handlers for webhooks only (but calendar date range fetch needs a Route Handler since it's a client-side GET)
- **DAL pattern:** Auth checks in server-only DB functions
- **Import conventions:** `db` from `@/lib/db`, `schema` from `@/lib/db/schema`
- **Drizzle pitfalls:** `numeric()` returns strings (use `mode:'number'`), mutations need `.returning()`, relational API does not support aggregations

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All DAL files (`artists.ts`, `gift-cards.ts`, `contacts.ts`, `appointments.ts`), all referenced UI components, existing page patterns, action patterns, schema definitions
- [FullCalendar React docs](https://fullcalendar.io/docs/react) -- setup, plugin architecture
- [FullCalendar datesSet docs](https://fullcalendar.io/docs/datesSet) -- callback signature and behavior
- [FullCalendar eventClick docs](https://fullcalendar.io/docs/eventClick) -- event interaction
- [FullCalendar Event Object docs](https://fullcalendar.io/docs/event-object) -- extendedProps, color properties
- [FullCalendar CSS customization docs](https://fullcalendar.io/docs/css-customization) -- CSS variables, override techniques

### Secondary (MEDIUM confidence)
- [@fullcalendar/react npm](https://www.npmjs.com/package/@fullcalendar/react) -- v6.1.20 confirmed as latest
- [FullCalendar content injection docs](https://fullcalendar.io/docs/content-injection) -- React JSX in render hooks

### Tertiary (LOW confidence)
- FullCalendar + React 19 compatibility: No explicit compatibility statement found in docs. v6.1.20 was published ~Dec 2025, so it likely supports React 19 but this is unverified. If issues arise, test with `--legacy-peer-deps` flag during install.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- FullCalendar is well-documented, all other dependencies already installed
- Architecture: HIGH -- All patterns exist in codebase, this is assembly work
- Pitfalls: HIGH -- Identified from direct codebase analysis (schema gaps, pagination mismatch, missing DAL function, missing nav items)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable -- FullCalendar v6 is mature, codebase patterns are established)
