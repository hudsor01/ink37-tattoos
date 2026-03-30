# Phase 18: Feature Depth -- Records - Research

**Researched:** 2026-03-30
**Domain:** Admin dashboard record management pages -- bulk actions, inline editing, conflict detection UI, PDF receipts, image galleries, order fulfillment
**Confidence:** HIGH

## Summary

Phase 18 adds operational depth to 6 existing admin dashboard record management pages. The codebase already has the core CRUD, pagination, and UI foundations from prior phases (13-17). This phase layers on bulk operations (customer CSV import/export, multi-select delete), inline editing (customer detail, session detail), UI surfacing of existing backend conflict detection, server-side PDF receipt generation via the external Stirling PDF service, product image galleries with drag-to-reorder, and order fulfillment status tracking.

The primary risk is the Stirling PDF integration since it depends on an external self-hosted service at `pdf.thehudsonfam.com`. All other features are standard React/Next.js UI patterns building on the existing DataTable, Vercel Blob upload, and server action infrastructure. Two small schema changes are needed: a `productImage` table for multi-image product galleries and a `trackingNumber` column on the `order` table.

**Primary recommendation:** Build features in dependency order -- schema changes first (productImage table, order tracking field), then shared components (InlineEdit, BulkActionToolbar, CSV import), then page-by-page feature additions. Use `@dnd-kit/sortable` for drag reorder, `papaparse` for CSV parsing, and a server-side API route proxying to Stirling PDF for receipts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bulk selection via checkbox column in DataTable, toolbar with Delete/Export when selected
- **D-02:** CSV import via file upload Dialog. Preview parsed rows. Duplicate detection by email match. Show conflicts before import.
- **D-03:** Inline editing on customer detail page. Create appointment/session from customer page. Communication timeline. Portal account indicator.
- **D-04:** `checkSchedulingConflict()` already wired in server actions from Phase 14. Need to surface conflict warnings in the UI via AlertDialog when conflict detected, allow override.
- **D-05:** Full session detail page at `/dashboard/sessions/[id]`. Shows all session fields, linked payment records, image gallery per session. Click any field to toggle inline edit mode. Save per-field.
- **D-06:** Claude decides inline edit component pattern (click-to-edit with save/cancel).
- **D-07:** Generate PDF receipts via Stirling PDF at `pdf.thehudsonfam.com`. Render receipt as HTML template, POST to `/api/v1/convert/html/pdf`, return PDF blob for download. API route needed in the app to proxy the request.
- **D-08:** Receipt includes: studio name/logo, customer name, session details, amount, payment method, date, receipt number.
- **D-09:** Vercel Blob multi-upload for product images. Sortable drag grid for ordering. Visibility toggle per image for public store.
- **D-10:** Schema needs product images support. Claude decides JSON array vs separate table.
- **D-11:** Claude decides appropriate depth for solo-artist store. Visual status timeline (Paid->Processing->Shipped->Delivered). Tracking number field. Simple returns (status change to REFUNDED + Stripe refund).

### Claude's Discretion
- Bulk selection UX pattern details
- Inline edit component implementation
- Product images schema (JSON array vs separate table)
- Order fulfillment complexity (simple status + tracking vs full workflow)
- Customer communication timeline data source
- Session image gallery upload/display pattern

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEAT-02 | Customer list: bulk actions (delete, export CSV), CSV import, duplicate detection, lifecycle indicator | DataTable already has `enableRowSelection`/`onRowSelectionChange`. CSV export utility exists. Papaparse for import parsing. Email-match duplicate detection via DAL query. |
| FEAT-03 | Customer detail: inline editing, create appointment/session from customer page, communication timeline, portal account indicator | InlineEdit component pattern (click-to-edit). Customer already has `userId` FK for portal linking. Communication timeline from appointments + contacts by email. |
| FEAT-04 | Appointment list: conflict detection on create/edit, conflict warnings in UI | `checkSchedulingConflict()` exists in DAL and is already called in appointment actions. Currently throws error -- needs UI AlertDialog with override option. |
| FEAT-05 | Session management: edit mode, detail view, linked payments, image gallery | Session detail page `/dashboard/sessions/[id]` with `getSessionById` (already returns customer, artist, appointment). `getPaymentsBySession` exists. Session `referenceImages` field already on schema. |
| FEAT-06 | Payment receipt PDF generation/download | Stirling PDF API at `pdf.thehudsonfam.com/api/v1/convert/html/pdf`. Server-side API route proxies HTML template to Stirling. Returns PDF blob. |
| FEAT-07 | Product image galleries, visibility toggle, multi-image | New `productImage` table with `sortOrder` and `isVisible` fields. `@dnd-kit/sortable` for drag reorder. Vercel Blob upload reuse. |
| FEAT-08 | Order status timeline/history, shipping tracking, fulfillment workflow, returns | Add `trackingNumber` column to `order` table. Visual status timeline component. Refund action already exists. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | DataTable with row selection | Already powers all list pages, has enableRowSelection built-in |
| @tanstack/react-query | 5.91.3 | Server state management | Already used for all data fetching, query invalidation |
| @vercel/blob | 2.3.1 | File uploads | Already used for media uploader, product images follow same pattern |
| sonner | 2.0.7 | Toast notifications | Already used everywhere |
| date-fns | 4.1.0 | Date formatting | Already used everywhere |
| zod | 4.3.6 | Schema validation | Already used for all form/action validation |
| react-hook-form | 7.71.2 | Form state management | Already used for all forms per Phase 15 decision |
| framer-motion | 12.38.0 | Animations | Already installed, use for sortable image transitions |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives | Product image gallery sortable grid |
| @dnd-kit/sortable | 10.0.0 | Sortable list/grid | Image reordering with SortableContext |
| @dnd-kit/utilities | 3.2.2 | CSS transform utilities | For SortableItem transform/transition |
| papaparse | 5.5.3 | CSV parsing | Customer CSV import with preview and validation |
| @types/papaparse | 5.5.2 | TypeScript types | Dev dependency for papaparse |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | react-beautiful-dnd | react-beautiful-dnd is unmaintained since 2023; @dnd-kit is the ecosystem standard |
| papaparse | csv-parse | csv-parse is Node.js only; papaparse works in browser for client-side preview before server submission |
| Stirling PDF | jsPDF / @react-pdf/renderer | **LOCKED**: User explicitly requires Stirling PDF at pdf.thehudsonfam.com. Do NOT use client-side PDF libraries |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities papaparse
npm install -D @types/papaparse
```

## Architecture Patterns

### Schema Changes Required

**1. Product Image Table (separate table, not JSON array)**

Recommendation: Use a separate `productImage` table rather than a JSON array column. Reasons:
- Individual visibility toggles per image (queried independently for public store)
- Sort order as a proper column (indexed, updateable without rewriting whole array)
- Vercel Blob URLs as individual rows (easier cleanup/deletion)
- Relational queries work naturally with Drizzle's `with` clause

```typescript
// In src/lib/db/schema.ts
export const productImage = pgTable('product_image', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('productId').notNull().references(() => product.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt: text('alt'),
  sortOrder: integer('sortOrder').notNull().default(0),
  isVisible: boolean('isVisible').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('product_image_productId_idx').on(table.productId),
  index('product_image_productId_sortOrder_idx').on(table.productId, table.sortOrder),
]);
```

**2. Order tracking number column**

```typescript
// Add to existing order table
trackingNumber: text('trackingNumber'),
trackingCarrier: text('trackingCarrier'), // e.g., 'USPS', 'UPS', 'FedEx'
```

### Component Architecture

```
src/
  components/
    dashboard/
      inline-edit.tsx              # Generic click-to-edit component
      bulk-action-toolbar.tsx      # Floating toolbar for selected rows
      csv-import-dialog.tsx        # CSV upload, preview, duplicate detection
      sortable-image-grid.tsx      # @dnd-kit sortable grid for product images
      order-fulfillment-timeline.tsx # Visual status timeline
      receipt-download-button.tsx  # Triggers PDF receipt generation
  app/
    (dashboard)/
      dashboard/
        sessions/[id]/page.tsx     # NEW: Session detail page
    api/
      receipts/[paymentId]/route.ts  # NEW: PDF receipt proxy to Stirling PDF
  lib/
    dal/
      product-images.ts            # NEW: Product image CRUD
    actions/
      customer-actions.ts          # ADD: bulk delete, CSV import actions
      product-image-actions.ts     # NEW: Image CRUD, reorder, visibility toggle
      order-actions.ts             # ADD: tracking number update action
      receipt-actions.ts           # NEW: Receipt generation proxy
```

### Pattern 1: InlineEdit Component
**What:** A reusable click-to-edit pattern that toggles between display and edit mode per field.
**When to use:** Customer detail page and session detail page where individual fields can be edited without a full form.

```typescript
// click-to-edit with save/cancel
interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date';
  options?: { value: string; label: string }[];  // for select type
}

function InlineEdit({ value, onSave, label, type = 'text' }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (editValue === value) { setIsEditing(false); return; }
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch { /* error handled by caller */ }
    finally { setIsSaving(false); }
  }

  if (!isEditing) {
    return (
      <button onClick={() => setIsEditing(true)} className="...">
        <span>{value || '-'}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={editValue} onChange={...} />
      <Button size="icon-sm" onClick={handleSave} disabled={isSaving}>
        <Check className="h-3 w-3" />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={() => { setEditValue(value); setIsEditing(false); }}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

### Pattern 2: Bulk Action Toolbar
**What:** A floating toolbar that appears when rows are selected in the DataTable.
**When to use:** Customer list page for bulk delete and export.

The DataTable already supports `enableRowSelection` and `onRowSelectionChange`. The toolbar renders conditionally when `selectedRows.length > 0` and provides Delete All / Export CSV buttons.

### Pattern 3: Conflict Detection UI
**What:** Surface scheduling conflict warnings from the existing `checkSchedulingConflict()` function.
**When to use:** Appointment create/edit forms.

Currently the appointment action throws an error on conflict. The UI change is:
1. Catch the "scheduling conflict" error specifically in the form handler
2. Show an AlertDialog warning: "Another appointment exists at this time. Do you want to proceed?"
3. If user confirms, re-submit with a `forceOverride: true` flag
4. The action skips conflict check when `forceOverride` is true

### Pattern 4: Stirling PDF Receipt Generation
**What:** Server-side HTML-to-PDF via external Stirling PDF API.
**When to use:** Payment receipt download.

```typescript
// src/app/api/receipts/[paymentId]/route.ts
export async function GET(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  // 1. Auth check
  // 2. Fetch payment + session + customer data from DAL
  // 3. Render HTML receipt template string
  // 4. POST to Stirling PDF as multipart/form-data:
  //    - fileInput: HTML file (Buffer from template string)
  //    - zoom: 1
  // 5. Return PDF blob as response with Content-Disposition: attachment

  const formData = new FormData();
  formData.append('fileInput', new Blob([htmlTemplate], { type: 'text/html' }), 'receipt.html');
  formData.append('zoom', '1');

  const pdfResponse = await fetch('https://pdf.thehudsonfam.com/api/v1/convert/html/pdf', {
    method: 'POST',
    body: formData,
  });

  return new Response(pdfResponse.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${paymentId.slice(0, 8)}.pdf"`,
    },
  });
}
```

### Anti-Patterns to Avoid
- **Client-side PDF generation:** Do NOT use jsPDF or @react-pdf/renderer. The locked decision requires server-side generation via Stirling PDF.
- **JSON array for product images:** A JSON column prevents independent queries, doesn't support indexed sort order, and makes concurrent edits dangerous. Use a separate table.
- **Full-form inline edit:** Don't replace the entire customer detail page with one big edit form. Use per-field click-to-edit for quick updates; keep the existing Dialog-based full edit form as a fallback.
- **Custom drag-and-drop:** Don't build custom drag handlers with mouse/touch events. Use @dnd-kit which handles accessibility, keyboard navigation, and all browser quirks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom regex/split parser | papaparse | Handles quoting, encoding, edge cases, streaming for large files |
| Drag-and-drop sortable | Custom mouse/touch event handlers | @dnd-kit/sortable | Accessibility (keyboard, screen reader), sensor abstraction, animations |
| PDF generation | Client-side canvas-to-PDF | Stirling PDF API | Locked decision; server-side ensures consistent rendering |
| Bulk selection state | Custom Set/Map tracking | TanStack Table `enableRowSelection` | Already built into DataTable, handles pagination, filtering |
| Status timeline | Custom SVG/canvas | Semantic HTML with CSS | Simpler, accessible, maintainable for 4-5 status steps |

**Key insight:** Most "features" in this phase are UI components wiring together existing DAL/action infrastructure. Resist the urge to rebuild backend logic -- focus on surfacing what already exists.

## Common Pitfalls

### Pitfall 1: Stirling PDF Network Errors
**What goes wrong:** The external Stirling PDF service at `pdf.thehudsonfam.com` may be down, slow, or return errors.
**Why it happens:** Self-hosted service, network dependency, no SLA.
**How to avoid:** Wrap in try/catch with user-friendly error message ("Receipt generation temporarily unavailable"). Add timeout (10 seconds). Show loading state during generation. Consider caching generated PDFs (save URL to payment record).
**Warning signs:** Timeout errors, 5xx responses, connection refused.

### Pitfall 2: CSV Import Data Quality
**What goes wrong:** CSV files from other systems have inconsistent column names, encoding issues, empty rows, or mixed date formats.
**Why it happens:** No standard for CSV export across tattoo management tools.
**How to avoid:** Preview parsed rows before import. Flexible column mapping (don't require exact header names). Skip empty rows. Validate email format. Show clear error messages per row.
**Warning signs:** Import succeeds but data is garbled. Duplicate customers created silently.

### Pitfall 3: Conflict Override State Lost
**What goes wrong:** User confirms conflict override, but the form re-submits without the override flag, causing another conflict error loop.
**Why it happens:** React state reset on re-render, or FormData doesn't include the override field.
**How to avoid:** Use a ref or separate state variable for `forceOverride`. Pass it alongside the form data in the action call. Clear it after successful submission.
**Warning signs:** Infinite AlertDialog loop when trying to override a conflict.

### Pitfall 4: @dnd-kit Sortable with Server State
**What goes wrong:** Optimistic reorder in UI, but server update fails, leaving inconsistent sort orders.
**Why it happens:** Drag end fires optimistic update, server call fails, no rollback.
**How to avoid:** Use optimistic update pattern with rollback. Send new sort order as an array of `{id, sortOrder}` pairs. Transaction-wrap the bulk update in DAL. Invalidate query on success/failure.
**Warning signs:** Images appear in wrong order after page refresh.

### Pitfall 5: Drizzle Numeric Returns Strings
**What goes wrong:** Receipt template shows `[object Object]` or string concatenation instead of formatted currency.
**Why it happens:** Drizzle `numeric()` returns strings by default unless `mode: 'number'` is set.
**How to avoid:** All monetary columns in schema already use `mode: 'number'` (verified). But always use `Number()` cast when formatting monetary values from query results, especially in the receipt HTML template.
**Warning signs:** "$NaN" or "$undefined" in receipt PDF.

### Pitfall 6: Session Detail Page "session" Name Collision
**What goes wrong:** Importing both the auth `session` table and `tattooSession` table causes name collisions. Also the variable name `session` from `getCurrentSession()` collides with the tattoo session data.
**Why it happens:** The schema has a `session` table (auth) and `tattooSession` table (domain). Both are commonly imported.
**How to avoid:** Always use `tattooSession` for the domain model. In components, name the data variable `sessionData` or `tattooSessionDetail` to avoid shadowing the auth session.
**Warning signs:** TypeScript errors about incompatible types, or auth session data rendered where tattoo session data was expected.

## Code Examples

### Customer Bulk Delete Action
```typescript
// In customer-actions.ts
export async function bulkDeleteCustomersAction(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  const session = await requireRole('admin');
  return safeAction(async () => {
    // Validate all IDs are UUIDs
    ids.forEach(id => z.string().uuid().parse(id));

    const result = await db.delete(schema.customer)
      .where(inArray(schema.customer.id, ids))
      .returning({ id: schema.customer.id });

    const hdrs = await headers();
    after(() => logAudit({
      userId: session.user.id,
      action: 'BULK_DELETE',
      resource: 'customer',
      ip: hdrs.get('x-forwarded-for') ?? 'unknown',
      userAgent: hdrs.get('user-agent') ?? 'unknown',
      metadata: { deletedIds: ids, count: result.length },
    }));

    revalidatePath('/dashboard/customers');
    return { deleted: result.length };
  });
}
```

### CSV Import with Duplicate Detection
```typescript
// Client-side parsing with papaparse
import Papa from 'papaparse';

function handleFileUpload(file: File) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      // results.data is array of objects with header keys
      // results.errors contains per-row parse errors
      setParsedRows(results.data);
      setParseErrors(results.errors);
    },
  });
}

// Server-side duplicate detection
export async function checkDuplicateEmails(emails: string[]): Promise<string[]> {
  const existing = await db.select({ email: schema.customer.email })
    .from(schema.customer)
    .where(inArray(schema.customer.email, emails));
  return existing.map(r => r.email).filter(Boolean) as string[];
}
```

### Product Image Sortable Grid
```typescript
// Using @dnd-kit/sortable
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableImageItem({ image }: { image: ProductImage }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <img src={image.url} alt={image.alt ?? ''} className="rounded-md object-cover" />
      {/* Visibility toggle, delete button */}
    </div>
  );
}
```

### Receipt HTML Template
```typescript
function renderReceiptHtml(data: {
  studioName: string;
  logoUrl?: string;
  customerName: string;
  sessionDescription: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  receiptNumber: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
  .details { margin: 20px 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .total { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; }
  .footer { text-align: center; margin-top: 40px; color: #666; font-size: 0.9em; }
</style></head>
<body>
  <div class="header">
    <h1>${data.studioName}</h1>
    <p>Receipt #${data.receiptNumber}</p>
  </div>
  <div class="details">
    <div class="row"><span>Customer</span><span>${data.customerName}</span></div>
    <div class="row"><span>Service</span><span>${data.sessionDescription}</span></div>
    <div class="row"><span>Date</span><span>${data.date.toLocaleDateString()}</span></div>
    <div class="row"><span>Payment Method</span><span>${data.paymentMethod}</span></div>
    <div class="row total"><span>Amount Paid</span><span>$${data.amount.toFixed(2)}</span></div>
  </div>
  <div class="footer"><p>Thank you for your business!</p></div>
</body>
</html>`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/sortable | 2023 | react-beautiful-dnd unmaintained; @dnd-kit is actively developed, accessible |
| jsPDF client-side | Server-side HTML-to-PDF (Stirling/Puppeteer/WeasyPrint) | Ongoing | Server-side renders consistently across browsers, handles CSS properly |
| JSON array columns for images | Separate relation table | Best practice | Proper indexes, independent queries, no full-rewrite on single edit |
| window.confirm() for destructive actions | AlertDialog components | Phase 15 | Accessible, styled, consistent with design system |

## Open Questions

1. **Stirling PDF Authentication**
   - What we know: Stirling PDF supports optional API key auth via `X-API-Key` header. The instance at `pdf.thehudsonfam.com` may or may not require auth.
   - What's unclear: Whether the Stirling instance requires an API key or is open.
   - Recommendation: Test the API with a simple health check first. If auth is required, add `STIRLING_PDF_API_KEY` to env schema.

2. **Customer Communication Timeline Data Source**
   - What we know: No dedicated "communication" table exists. Related data comes from: appointments (interactions), contacts (form submissions matching email), and audit log entries.
   - What's unclear: Whether to query across all these tables or just show appointment + contact history.
   - Recommendation: Query appointments + contacts by customer email. Audit log is internal and should not be shown in the customer timeline. Keep it simple -- show appointments and contact form submissions in reverse chronological order.

3. **Session Image Gallery Storage**
   - What we know: The `tattooSession` table already has `referenceImages: text('referenceImages').array()` for URLs.
   - What's unclear: Whether to reuse this existing array field or create a separate `sessionImage` table like `productImage`.
   - Recommendation: Reuse the existing `referenceImages` array field for session images. Unlike product images, session images don't need individual visibility toggles or sort order -- they're just a gallery of work-in-progress/completed photos. Simple array of Vercel Blob URLs is sufficient.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Stirling PDF API | FEAT-06 (receipts) | Must verify | -- | Graceful error message "Receipt generation unavailable" |
| Vercel Blob | FEAT-05, FEAT-07 (image uploads) | Yes (configured) | 2.3.1 | -- |
| Neon PostgreSQL | Schema changes | Yes (configured) | -- | -- |
| Stripe API | FEAT-08 (refunds) | Yes (configured) | 20.4.1 | -- |

**Missing dependencies with no fallback:**
- None that block execution. Stirling PDF is the only external dependency and can be gracefully degraded.

**Missing dependencies with fallback:**
- Stirling PDF service availability unknown -- fallback is to show "Receipt unavailable" with a retry button.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-02 | Bulk delete customers action | unit | `npx vitest run src/__tests__/customer-bulk-actions.test.ts -t "bulk delete"` | Wave 0 |
| FEAT-02 | CSV import duplicate detection | unit | `npx vitest run src/__tests__/customer-csv-import.test.ts` | Wave 0 |
| FEAT-04 | Conflict detection returns warning (not hard error) with override | unit | `npx vitest run src/__tests__/appointment-conflict-override.test.ts` | Wave 0 |
| FEAT-06 | Receipt API route generates PDF via Stirling | unit | `npx vitest run src/__tests__/receipt-generation.test.ts` | Wave 0 |
| FEAT-07 | Product image CRUD and reorder | unit | `npx vitest run src/__tests__/product-image-actions.test.ts` | Wave 0 |
| FEAT-08 | Order status update with tracking number | unit | `npx vitest run src/__tests__/order-fulfillment.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/customer-bulk-actions.test.ts` -- covers FEAT-02 bulk operations
- [ ] `src/__tests__/customer-csv-import.test.ts` -- covers FEAT-02 CSV import + duplicate detection
- [ ] `src/__tests__/appointment-conflict-override.test.ts` -- covers FEAT-04 override flow
- [ ] `src/__tests__/receipt-generation.test.ts` -- covers FEAT-06 HTML template + API call mock
- [ ] `src/__tests__/product-image-actions.test.ts` -- covers FEAT-07 CRUD + reorder
- [ ] `src/__tests__/order-fulfillment.test.ts` -- covers FEAT-08 tracking + status transition

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19.2
- **ORM:** Drizzle ORM 0.45.1 -- relational query API for reads, SQL builder for aggregations
- **Auth:** Better Auth v1.5.5 with 5-tier RBAC
- **UI:** Shadcn/Radix + Tailwind CSS 4
- **Storage:** Vercel Blob
- **Pattern:** DAL pattern -- auth checks in server-only DB functions
- **Mutations:** Server Actions for mutations, Route Handlers for webhooks only
- **Schema location:** `src/lib/db/schema.ts`
- **Import convention:** `db` from `@/lib/db`, `schema` from `@/lib/db/schema`
- **Monetary columns:** All use `mode: 'number'` to avoid string returns
- **Mutations must use `.returning()`** and handle empty result arrays
- **Keep RHF** in all forms, use `form.setError()` for server errors (Phase 15 decision)
- **Use AlertDialog** for all destructive actions (not browser `confirm()`)
- **Consistent toast patterns** via `toast.promise` for loading/success/error states

## Sources

### Primary (HIGH confidence)
- Codebase audit: `src/lib/db/schema.ts` -- verified all table structures, column types, relations
- Codebase audit: `src/lib/dal/*.ts` -- verified existing DAL functions including `checkSchedulingConflict`, `getPaymentsBySession`, pagination patterns
- Codebase audit: `src/lib/actions/*.ts` -- verified action patterns, `safeAction` wrapper, audit logging
- Codebase audit: `src/components/dashboard/data-table.tsx` -- verified `enableRowSelection` support
- Codebase audit: `src/components/dashboard/media-uploader.tsx` -- verified Vercel Blob upload pattern
- Codebase audit: `src/lib/utils/csv-export.ts` -- verified existing CSV export utility

### Secondary (MEDIUM confidence)
- [Stirling PDF API docs](https://docs.stirlingpdf.com/API/) -- `POST /api/v1/convert/html/pdf` accepts multipart/form-data with `fileInput` (HTML file) and `zoom` parameters, returns PDF blob
- [DeepWiki Stirling PDF](https://deepwiki.com/Stirling-Tools/Stirling-PDF/6-backend-api) -- confirmed endpoint format and WeasyPrint dependency
- [GitHub GHSA-xw8v-9mfm-g2pm](https://github.com/Stirling-Tools/Stirling-PDF/security/advisories/GHSA-xw8v-9mfm-g2pm) -- confirmed multipart/form-data with `fileInput` filename and `text/html` content type

### Tertiary (LOW confidence)
- @dnd-kit/sortable v10.0.0 API -- verified version number from npm registry but API patterns based on training data (v9.x API similar)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already installed and patterns verified in codebase
- Architecture: HIGH -- building on existing patterns (DataTable, Vercel Blob, server actions, DAL)
- Pitfalls: HIGH -- identified from direct codebase analysis (name collisions, numeric strings, etc.)
- Stirling PDF integration: MEDIUM -- API format confirmed but auth requirements and runtime availability unknown
- @dnd-kit v10 API: MEDIUM -- version verified, API likely stable but minor breaking changes possible from v9

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack, no fast-moving dependencies)
