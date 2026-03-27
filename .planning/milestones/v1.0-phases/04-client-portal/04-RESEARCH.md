# Phase 4: Client Portal - Research

**Researched:** 2026-03-21
**Domain:** Client-facing authenticated portal (Next.js route group, Better Auth, Prisma DAL)
**Confidence:** HIGH

## Summary

Phase 4 builds a self-service client portal within the existing Next.js 16 application using the `(portal)` route group that was scaffolded in Phase 1. The portal gives tattoo clients read access to their appointments, tattoo sessions/designs, payment receipts, and allows them to sign consent forms digitally. The core technical challenges are: (1) implementing Better Auth registration with automatic Customer-record linking via `databaseHooks`, (2) building a new DAL authorization pattern (`requirePortalAuth`) that scopes all queries to the authenticated user's linked Customer, and (3) adding consent form signing as a server action with schema migration for two new fields.

The existing codebase provides excellent foundations: Better Auth is fully configured with email/password enabled, the `signUp` export is already available from `auth-client.ts`, the Customer model already has the `userId` FK with unique constraint, and a `proxy.ts` file already handles `/portal` route protection (though it needs to be wired into middleware.ts). All UI components needed (Tabs, Card, Badge, Form, Input, Checkbox, Button) are already installed as Shadcn components.

**Primary recommendation:** Follow the established DAL pattern but with `requirePortalAuth` that returns the user's Customer record (not just session). Use Better Auth `databaseHooks.user.create.after` for auto-linking on registration. Wire proxy.ts into middleware.ts. Add 2 fields to TattooSession for consent tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Auto-link by email match on registration -- when a new user registers via Better Auth, if their email matches an existing Customer.email, set Customer.userId to the new User.id automatically
- **D-02:** If no Customer match on registration, create a new Customer record with the user's name and email -- don't block registration
- **D-03:** No admin invitation flow in this phase -- clients self-register, admin creates Customer records in dashboard as before
- **D-04:** Clients can update their own profile (name, phone, address) but NOT medical info -- medical info stays admin-only
- **D-05:** Registration page at `/register` in the `(auth)` route group, shared with existing `/login`
- **D-06:** Inline HTML consent form with acknowledgment checkbox and digital signature (typed name + timestamp) -- not PDF generation
- **D-07:** Extend TattooSession with `consentSignedAt: DateTime?` and `consentSignedBy: String?` fields -- no separate ConsentForm model
- **D-08:** Consent can be signed before the appointment -- that's the primary use case (client signs in advance via portal)
- **D-09:** Consent form content at Claude's discretion -- standard tattoo studio consent (health risks, allergies, aftercare, age verification, release of liability)
- **D-10:** Once signed, consent is read-only -- cannot be unsigned by client (admin can reset if needed)
- **D-11:** Simple horizontal nav/tabs at top -- lighter feel than admin sidebar, appropriate for 4-page portal
- **D-12:** 4 pages: Overview (dashboard), Appointments, My Tattoos (designs + sessions combined), Payments
- **D-13:** Overview shows: next upcoming appointment, most recent payment, quick links to other sections
- **D-14:** Mobile responsive -- tabs scroll horizontally on small screens
- **D-15:** Portal layout gets its own styled header with user name and logout -- distinct from public site and admin
- **D-16:** Pricing: clients see total cost, deposit paid, balance remaining -- NOT hourly rate or estimated hours
- **D-17:** Admin notes are internal only -- never shown to clients
- **D-18:** Medical info not visible to clients -- managed by admin only
- **D-19:** Clients can view their tattoo designs with images but cannot download original files -- protects artist IP
- **D-20:** Payment history shows same receipt links (Stripe-hosted) as admin -- per Phase 3 D-16
- **D-21:** New `requirePortalAuth` DAL helper -- checks session exists and user has linked Customer record; redirects to login if not authenticated
- **D-22:** Middleware updated to protect `/portal` routes same as `/dashboard` -- redirect to login if no session
- **D-23:** Portal users have role `user` (Better Auth default) -- distinct from staff/admin roles; portal DAL functions only query data belonging to the authenticated user's linked Customer

### Claude's Discretion
- Portal visual design and branding consistency with public site
- Exact consent form content wording
- Appointment card/list design
- Empty state messages for new users with no history
- Error handling for unlinked accounts (user exists but no Customer)

### Deferred Ideas (OUT OF SCOPE)
- Client-initiated payments from portal (pay deposit/balance directly) -- could be added later but not in PORT-05 scope (view only)
- Client booking from portal (currently uses Cal.com on public site) -- separate enhancement
- Client message/chat with artist -- out of scope per PROJECT.md
- Appointment reminders via email/SMS -- MKT-02 in v2 roadmap
- Client design approval workflow -- ENH-05 in v2 roadmap
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-01 | Client registration and login (Better Auth with email/password) | Better Auth `signUp.email()` / `signIn.email()` already exported from `auth-client.ts`. Registration page at `/register` in `(auth)` group. `databaseHooks.user.create.after` for Customer linking. |
| PORT-02 | Client can view their appointment history and upcoming bookings | Portal DAL `getPortalAppointments(customerId)` scoped by `requirePortalAuth`. Reuse StatusBadge. Filter out admin notes. |
| PORT-03 | Client can view their tattoo designs and session details | Portal DAL for sessions + designs. Exclude `hourlyRate`, `estimatedHours`, `notes` from select. Show `totalCost`, `depositAmount`, `paidAmount`. |
| PORT-04 | Client can access and sign digital consent forms | Schema migration adds `consentSignedAt`/`consentSignedBy` to TattooSession. Server action for signing with Zod validation. Inline HTML form with checkbox + typed name. |
| PORT-05 | Client can view payment history and receipts | Portal DAL for payments scoped to customer. Reuse receipt link pattern from admin `columns.tsx`. View only -- no payment initiation. |
| PORT-06 | Client account linked to existing Customer records in admin | `databaseHooks.user.create.after` auto-links by email. Fallback creates new Customer record. `Customer.userId` FK already exists with unique constraint. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 | App Router, route groups, server components | Framework already in use |
| Better Auth | 1.5.5 | Registration, login, session management | Already configured with email/password enabled |
| Prisma | 7.5.0 | ORM for portal DAL queries | Already in use for all data access |
| React Hook Form | 7.71.2 | Registration form, consent form, profile edit | Already installed with Shadcn Form component |
| Zod | 4.3.6 | Validation schemas for portal actions | Already used across all server actions |
| date-fns | 4.1.0 | Date formatting for appointments/payments | Already used in payment columns |
| lucide-react | 0.462.0 | Icons for portal UI | Already used across admin |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Shadcn Tabs | (base-ui) | Portal navigation tabs | D-11: horizontal tab navigation |
| Shadcn Card | - | Appointment/session/payment cards | Overview page, list items |
| Shadcn Badge | - | Status indicators | Reuse StatusBadge for appointment/payment status |
| Shadcn Checkbox | - | Consent form acknowledgment | D-06: consent checkbox |
| sonner | 2.0.7 | Toast notifications | Success/error feedback on consent signing |

### No Additional Packages Needed
All dependencies are already installed. No `npm install` required for Phase 4.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Existing (needs real implementation)
│   │   └── register/page.tsx       # NEW: client registration
│   └── (portal)/
│       └── portal/
│           ├── page.tsx            # Overview dashboard
│           ├── appointments/
│           │   └── page.tsx        # Appointment history
│           ├── tattoos/
│           │   └── page.tsx        # Designs + sessions combined
│           └── payments/
│               └── page.tsx        # Payment history + receipts
├── components/
│   └── portal/
│       ├── portal-nav.tsx          # Horizontal tab navigation header
│       ├── portal-header.tsx       # User name + logout header bar
│       ├── appointment-card.tsx    # Single appointment display
│       ├── session-card.tsx        # Tattoo session with consent status
│       ├── consent-form.tsx        # Inline consent with signature
│       ├── payment-row.tsx         # Payment list item with receipt link
│       ├── overview-card.tsx       # Overview page quick-info cards
│       └── profile-form.tsx        # Client profile edit form
├── lib/
│   ├── dal/
│   │   └── portal.ts              # NEW: all portal DAL functions
│   ├── actions/
│   │   └── portal-actions.ts      # NEW: consent signing, profile update
│   └── security/
│       └── validation.ts          # Add: ConsentSignSchema, UpdateProfileSchema
└── ...
```

### Pattern 1: Portal DAL with `requirePortalAuth`
**What:** A new authorization helper that authenticates the user AND resolves their linked Customer record, then scopes all queries to that Customer.
**When to use:** Every portal DAL function.
**Example:**
```typescript
// src/lib/dal/portal.ts
import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function requirePortalAuth() {
  const session = await getCurrentSession();
  if (!session?.user) redirect('/login');

  const customer = await db.customer.findUnique({
    where: { userId: session.user.id },
  });

  if (!customer) {
    // User exists but has no linked Customer record
    // This shouldn't normally happen if databaseHooks works correctly
    // but handle gracefully
    redirect('/portal/no-account');
  }

  return { session, customer };
}

export const getPortalAppointments = cache(async () => {
  const { customer } = await requirePortalAuth();
  return db.appointment.findMany({
    where: { customerId: customer.id },
    orderBy: { scheduledDate: 'desc' },
    select: {
      id: true,
      scheduledDate: true,
      duration: true,
      status: true,
      type: true,
      tattooType: true,
      size: true,
      placement: true,
      description: true,
      // OMIT: notes (admin-only per D-17)
    },
  });
});
```

### Pattern 2: Better Auth `databaseHooks` for Auto-Linking (D-01, D-02)
**What:** Server-side hook that runs after every user creation to auto-link or create Customer records.
**When to use:** Configured once in `auth.ts`.
**Example:**
```typescript
// In src/lib/auth.ts, add to betterAuth config:
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        // D-01: Try to link by email match
        const existingCustomer = await db.customer.findUnique({
          where: { email: user.email },
        });

        if (existingCustomer && !existingCustomer.userId) {
          await db.customer.update({
            where: { id: existingCustomer.id },
            data: { userId: user.id },
          });
        } else if (!existingCustomer) {
          // D-02: No match -- create new Customer
          const [firstName, ...rest] = (user.name || 'Client').split(' ');
          await db.customer.create({
            data: {
              firstName,
              lastName: rest.join(' ') || '',
              email: user.email,
              userId: user.id,
            },
          });
        }
        // If existingCustomer.userId is already set (edge case: same email,
        // different user), do nothing -- the new user won't have portal access
        // until admin resolves manually.
      },
    },
  },
},
```

### Pattern 3: Consent Signing as Server Action (D-06, D-07, D-10)
**What:** A server action that validates consent acknowledgment and writes the signature to TattooSession.
**When to use:** When client clicks "Sign Consent" on a session's consent form.
**Example:**
```typescript
// src/lib/actions/portal-actions.ts
'use server';

import { db } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { ConsentSignSchema } from '@/lib/security/validation';
import { revalidatePath } from 'next/cache';

export async function signConsentAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = ConsentSignSchema.parse({
    sessionId: formData.get('sessionId'),
    signedName: formData.get('signedName'),
    acknowledged: formData.get('acknowledged') === 'true',
  });

  // Verify the session belongs to this user's customer
  const customer = await db.customer.findUnique({
    where: { userId: session.user.id },
  });
  if (!customer) throw new Error('No linked customer account');

  const tattooSession = await db.tattooSession.findFirst({
    where: { id: validated.sessionId, customerId: customer.id },
  });
  if (!tattooSession) throw new Error('Session not found');

  // D-10: Cannot re-sign if already signed
  if (tattooSession.consentSignedAt) {
    throw new Error('Consent already signed');
  }

  await db.tattooSession.update({
    where: { id: validated.sessionId },
    data: {
      consentSigned: true,
      consentSignedAt: new Date(),
      consentSignedBy: validated.signedName,
    },
  });

  revalidatePath('/portal/tattoos');
  return { success: true };
}
```

### Pattern 4: Proxy.ts Middleware Integration (D-22)
**What:** The existing `proxy.ts` already protects both `/dashboard` and `/portal` routes. The middleware.ts needs updating to use it.
**When to use:** Phase 4 setup task.
**Current state:** `middleware.ts` only protects `/dashboard`. `proxy.ts` exists but is not imported.
**Fix:**
```typescript
// src/middleware.ts -- replace current contents:
import { proxy } from '@/proxy'; // or move proxy.ts into src/lib/

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*', '/login', '/register'],
};
```
**IMPORTANT:** The existing proxy.ts redirects all authenticated users from auth pages to `/dashboard`. This needs adjustment so portal-role users redirect to `/portal` instead. The proxy should check the user's role or default to portal for `user` role.

### Anti-Patterns to Avoid
- **Duplicating DAL functions:** Don't copy-paste staff DAL functions and remove `requireStaffRole`. Create `requirePortalAuth` once, use it in all portal DAL functions in a single `portal.ts` file.
- **Exposing sensitive fields through broad `select`:** Always use explicit `select` in portal queries to exclude `notes`, `hourlyRate`, `estimatedHours`, medical fields. Never use `include: { customer: true }` which returns all fields.
- **Client-side role checks only:** All data filtering MUST happen in the DAL. The portal UI is defense-in-depth, not the authorization boundary.
- **Using `findUnique` without ownership check:** Every portal DAL query must include `customerId: customer.id` in the `where` clause to prevent IDOR (Insecure Direct Object Reference).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User registration | Custom registration API route | Better Auth `signUp.email()` client method | Handles password hashing, session creation, email uniqueness |
| Session management | Cookie parsing, JWT verification | Better Auth `getCurrentSession()` + `useSession()` hook | Already configured, handles expiry and refresh |
| Form validation | Manual input checking | React Hook Form + Zod schemas + Shadcn Form component | Already established pattern across admin dashboard |
| Status display | Custom status rendering | Reuse `StatusBadge` component from dashboard | Already handles all appointment/payment status colors |
| Receipt links | Custom receipt generation | Stripe-hosted receipt URLs already stored in Payment model | `receiptUrl` field populated by webhook handler |
| Currency formatting | `toFixed(2)` scattered | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Already used in payment columns, consistent formatting |
| Date display | Raw date strings | `date-fns` `format()` | Already used in admin, consistent format |

**Key insight:** This phase is primarily about authorization scoping and UI, not new infrastructure. Nearly every technical component already exists -- the work is creating portal-specific DAL functions that filter data to the authenticated user's Customer record, and building the UI pages.

## Common Pitfalls

### Pitfall 1: Proxy.ts Not Wired Into Middleware
**What goes wrong:** The existing `middleware.ts` only matches `/dashboard/:path*`. If you forget to update the matcher, portal routes are unprotected at the middleware layer.
**Why it happens:** `proxy.ts` exists as a standalone file but is not imported by `middleware.ts`.
**How to avoid:** Replace `middleware.ts` contents to use `proxy.ts` logic and expand the matcher to include `/portal/:path*`, `/login`, `/register`.
**Warning signs:** Portal pages load without authentication, or users see a flash of content before redirect.

### Pitfall 2: Auth Page Redirect Target for Portal Users
**What goes wrong:** The existing `proxy.ts` redirects ALL authenticated users from `/login` and `/register` to `/dashboard`. Portal users (role `user`) should go to `/portal` instead.
**Why it happens:** proxy.ts was written during Phase 1 when only admin users existed.
**How to avoid:** The middleware cookie check alone cannot determine user role (cookies don't contain role info, just a session token). Two options: (a) always redirect to `/portal` for authenticated users and let the portal/dashboard pages handle role-based redirect, or (b) accept that the proxy redirects to `/dashboard` and let the dashboard middleware redirect non-staff users to `/portal`. Option (a) is simpler. Best approach: redirect to a neutral auth-check endpoint or `/portal` by default, since admin users will navigate directly to `/dashboard`.
**Warning signs:** Portal users land on the admin dashboard after login and get a permission error.

### Pitfall 3: IDOR Vulnerability in Portal Queries
**What goes wrong:** A client could view another client's appointments/sessions/payments by manipulating IDs if queries don't include `customerId` ownership checks.
**Why it happens:** Forgetting to include `customerId: customer.id` in `where` clauses.
**How to avoid:** Every portal DAL function MUST include the customer ownership filter. Never expose a portal endpoint that takes a raw ID without verifying ownership.
**Warning signs:** Changing the session/appointment ID in a URL loads someone else's data.

### Pitfall 4: Consent Form Re-Signing
**What goes wrong:** Client signs consent, then somehow signs again, overwriting the original timestamp and name.
**Why it happens:** No guard against re-signing in the server action.
**How to avoid:** Check `consentSignedAt !== null` before allowing sign. If already signed, return an error. Per D-10, consent is immutable once signed.
**Warning signs:** `consentSignedAt` keeps changing for the same session.

### Pitfall 5: Schema Migration Breaks Existing Data
**What goes wrong:** Adding `consentSignedAt` and `consentSignedBy` fields could fail if not nullable.
**Why it happens:** Existing TattooSession records don't have these fields.
**How to avoid:** Both new fields MUST be optional (`DateTime?` and `String?`). Existing `consentSigned Boolean` should remain and be kept in sync (set to `true` when `consentSignedAt` is populated). Use `prisma migrate dev` since this is additive only (adding nullable columns).
**Warning signs:** Migration fails with "column cannot be null" errors.

### Pitfall 6: Leaking Admin Notes and Hourly Rates
**What goes wrong:** Client sees admin-only notes, hourly rates, or estimated hours in the portal.
**Why it happens:** Using `include` or broad `select` in portal queries instead of explicit field selection.
**How to avoid:** Every portal DAL query uses explicit `select` that omits: `notes`, `hourlyRate`, `estimatedHours`, `allergies`, `medicalConditions`, `emergencyName`, `emergencyPhone`, `emergencyRel`.
**Warning signs:** Sensitive data visible in browser DevTools network tab.

### Pitfall 7: databaseHooks Race Condition with Existing Customer
**What goes wrong:** Two users register with the same email simultaneously, both try to link to the same Customer record.
**Why it happens:** `findUnique` + `update` is not atomic.
**How to avoid:** The `Customer.userId` has a unique constraint in the schema. If two concurrent registrations try to set the same `userId`, the second one will fail with a unique constraint violation. Wrap the linking in a try/catch and handle the conflict gracefully (the first one wins). This is unlikely in practice for a single-studio app.
**Warning signs:** Registration throws a Prisma unique constraint error.

## Code Examples

### Registration Form (Client Component)
```typescript
// src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const { data, error: authError } = await signUp.email({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      callbackURL: '/portal',
    });

    if (authError) {
      setError(authError.message ?? 'Registration failed');
      setLoading(false);
      return;
    }

    // Better Auth auto-signs-in after signup by default
    router.push('/portal');
  }

  // ... form JSX with Input components
}
```

### Portal Layout with Tab Navigation (D-11, D-15)
```typescript
// src/app/(portal)/layout.tsx
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalNav } from '@/components/portal/portal-nav';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader />
      <PortalNav />
      <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
    </div>
  );
}
```

### Portal Navigation (Horizontal Tabs with Mobile Scroll)
```typescript
// src/components/portal/portal-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Palette, CreditCard } from 'lucide-react';

const navItems = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal/appointments', label: 'Appointments', icon: Calendar },
  { href: '/portal/tattoos', label: 'My Tattoos', icon: Palette },
  { href: '/portal/payments', label: 'Payments', icon: CreditCard },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-5xl overflow-x-auto">
        <div className="flex min-w-max gap-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/portal' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

### Consent Form Validation Schema
```typescript
// Add to src/lib/security/validation.ts
export const ConsentSignSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  signedName: z.string().min(2, 'Please type your full name').max(200),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the consent terms' }),
  }),
});

export type ConsentSignData = z.infer<typeof ConsentSignSchema>;

export const UpdatePortalProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  // D-04: NO medical fields, NO notes
});

export type UpdatePortalProfileData = z.infer<typeof UpdatePortalProfileSchema>;
```

### Schema Migration
```prisma
// Add to TattooSession model in prisma/schema.prisma:
model TattooSession {
  // ... existing fields ...
  consentSigned     Boolean       @default(false)
  consentSignedAt   DateTime?                       // NEW
  consentSignedBy   String?                         // NEW
  // ... rest of model ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Middleware-only auth | DAL-level auth checks | Phase 1 design | Every portal query checks auth in the DAL, middleware is defense-in-depth |
| Separate login/register APIs | Better Auth handles both | Phase 1 setup | `signUp.email()` and `signIn.email()` are client-side calls to Better Auth's API route |
| PDF consent forms | Inline HTML + digital signature | D-06 decision | Simpler, no PDF library needed, legally sufficient for tattoo studios |
| Separate consent model | Fields on TattooSession | D-07 decision | Two nullable fields instead of a new table and relation |

## Open Questions

1. **Login Page Implementation Status**
   - What we know: The login page at `src/app/(auth)/login/page.tsx` is still a placeholder ("Authentication coming in Phase 2"). The Phase 2 test (`auth.test.ts`) checks for proxy.ts and auth route handler but the actual login UI was apparently not implemented.
   - What's unclear: Whether login was implemented elsewhere or if it's still a placeholder.
   - Recommendation: Phase 4 should implement both the login and registration pages as part of PORT-01, since both are needed for the portal flow. The existing `signIn` export from `auth-client.ts` is ready to use.

2. **Middleware.ts vs Proxy.ts Discrepancy**
   - What we know: `proxy.ts` exists at project root with portal protection logic. `middleware.ts` in `src/` only protects `/dashboard`. The auth test expects `proxy.ts` to exist and contain portal protection. But middleware.ts does not import or use proxy.ts.
   - What's unclear: Whether this was intentional (proxy.ts as a staged implementation) or an oversight.
   - Recommendation: Consolidate by replacing middleware.ts logic with proxy.ts logic. Move proxy.ts into `src/lib/` or inline its logic into middleware.ts. Update the matcher to include `/portal/:path*`, `/login`, `/register`.

3. **Post-Login Redirect Destination for Portal Users**
   - What we know: proxy.ts currently redirects all authenticated users from auth pages to `/dashboard`. Portal users (role `user`) should land on `/portal`.
   - What's unclear: Whether to check role in middleware (requires DB call or token inspection) or handle via client-side redirect.
   - Recommendation: The simplest correct approach -- let `signIn.email()` and `signUp.email()` use `callbackURL: '/portal'` for portal forms, and `callbackURL: '/dashboard'` for admin login. The proxy.ts redirect from auth pages can default to `/portal` since admin users typically bookmark `/dashboard` directly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | Registration auto-links Customer by email, creates new Customer if no match | unit | `npx vitest run src/__tests__/portal-auth.test.ts -t "auto-link" --reporter=verbose` | Wave 0 |
| PORT-02 | Portal appointments query scoped to authenticated user's Customer | unit | `npx vitest run src/__tests__/portal-dal.test.ts -t "appointments" --reporter=verbose` | Wave 0 |
| PORT-03 | Session/design queries exclude sensitive fields (notes, hourlyRate) | unit | `npx vitest run src/__tests__/portal-dal.test.ts -t "sensitive fields" --reporter=verbose` | Wave 0 |
| PORT-04 | Consent sign action validates input, prevents re-signing, writes timestamp | unit | `npx vitest run src/__tests__/portal-actions.test.ts -t "consent" --reporter=verbose` | Wave 0 |
| PORT-05 | Payment query returns receipt URLs, scoped to customer | unit | `npx vitest run src/__tests__/portal-dal.test.ts -t "payments" --reporter=verbose` | Wave 0 |
| PORT-06 | databaseHooks links existing Customer or creates new one | unit | `npx vitest run src/__tests__/portal-auth.test.ts -t "database hooks" --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/portal-auth.test.ts` -- covers PORT-01, PORT-06 (registration auto-linking, databaseHooks config)
- [ ] `src/__tests__/portal-dal.test.ts` -- covers PORT-02, PORT-03, PORT-05 (DAL function existence, field exclusion, customer scoping)
- [ ] `src/__tests__/portal-actions.test.ts` -- covers PORT-04 (consent signing action validation)
- [ ] Schema migration verification (consentSignedAt, consentSignedBy fields exist in schema)

## Sources

### Primary (HIGH confidence)
- **Existing codebase** -- all code files read directly from the repository provide the authoritative view of patterns, schemas, and existing components
- [Better Auth Email & Password docs](https://better-auth.com/docs/authentication/email-password) -- `signUp.email()` and `signIn.email()` API, auto-sign-in behavior, password requirements
- [Better Auth Client docs](https://better-auth.com/docs/concepts/client) -- `useSession` hook, session type inference, `signOut()` method
- [Better Auth Database docs](https://better-auth.com/docs/concepts/database) -- `databaseHooks.user.create.after` API shape, before/after hook signatures

### Secondary (MEDIUM confidence)
- [Better Auth Hooks concept page](https://better-auth.com/docs/concepts/hooks) -- `createAuthMiddleware`, `ctx.context.newSession`, `runInBackgroundOrAwait` for after-signup tasks

### Tertiary (LOW confidence)
- [GitHub Issue #7260](https://github.com/better-auth/better-auth/issues/7260) -- Foreign key constraint issue with `databaseHooks` during social login with transactions. Not directly applicable (this project uses email/password only) but flagged as awareness.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in package.json
- Architecture: HIGH -- follows established DAL/server-action patterns from Phases 1-3
- Auth integration: HIGH -- Better Auth docs verified via WebFetch, `databaseHooks` API confirmed
- Pitfalls: HIGH -- derived from direct codebase analysis (proxy.ts discrepancy, IDOR risk, field exposure)
- Consent form: MEDIUM -- legal content wording is at Claude's discretion per D-09, no legal review
- Middleware consolidation: HIGH -- proxy.ts and middleware.ts both read directly, discrepancy confirmed

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable -- no dependency upgrades expected)
