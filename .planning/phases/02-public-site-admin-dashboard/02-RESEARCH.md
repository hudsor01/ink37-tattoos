# Phase 2: Public Site + Admin Dashboard - Research

**Researched:** 2026-03-21
**Domain:** Full-stack web application (Next.js 16 App Router, React 19, Tailwind CSS 4, Prisma 7)
**Confidence:** HIGH

## Summary

Phase 2 reconstructs both the public tattoo website and the admin dashboard into the unified codebase established in Phase 1. The foundation (Prisma schema, DAL, auth, route groups, providers) is complete and solid. The primary work is building UI components, pages, server actions, and security infrastructure on top of that foundation.

The public site needs 7 pages (home, gallery, services, about, FAQ, contact, booking) with fresh design using the UI spec's design tokens and brand accent color. The admin dashboard needs 7 sections (overview, customers, appointments, sessions, media, analytics, settings) plus audit logging and RBAC enforcement. Security infrastructure (headers, rate limiting, CSRF, input validation) must protect all endpoints.

**Primary recommendation:** Build in three streams -- (1) shared infrastructure first (shadcn components, security headers, middleware, email service, audit logging), (2) public site pages in parallel, (3) admin dashboard pages in parallel. Use Server Actions for all mutations, TanStack Query for client-side data fetching, and the existing DAL for all data access.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rebuild with new design -- source repo is reference for content/structure only, not visual approach
- Fresh Tailwind CSS 4 styling, new layout decisions, new aesthetic
- Masonry grid with lightbox for gallery -- proven portfolio pattern, keep this approach
- Subtle and purposeful animations -- light entrance animations, smooth transitions, hover effects. Performance-first, let artwork speak. Use Framer Motion sparingly.
- Full feature parity with existing admin -- do not regress any functionality
- All features included: KPI dashboard, customer CRUD, appointment management, session tracking, media/portfolio management, analytics/reporting, settings, audit logging
- Rebuild with fresh design -- not a port of existing admin UI
- No command palette (cmdk) -- unnecessary complexity for single-user admin
- TanStack Query for all data fetching -- consistent pattern across public and admin
- DAL functions remain the security boundary -- all data access goes through DAL
- Research-driven Cal.com integration -- don't carry forward the "half-assed" integration
- Claude evaluates each source file case-by-case: port proven logic vs rewrite
- Source repos are reference material, not source of truth
- All new code must conform to Phase 1 architecture (DAL, route groups, unified schema)
- Research-driven, native-first security approach
- Audit logging: log ALL admin mutations -- user ID, timestamp, entity type, entity ID, and changes
- Downtime acceptable during deployment cutover

### Claude's Discretion
- Gallery filter categories (style, size, placement, or different taxonomy)
- Charting library choice (Recharts vs alternatives)
- Mutation pattern per use case (Server Actions vs Route Handlers)
- Port vs rewrite decisions per source file
- Rate limiting endpoint selection
- RBAC enforcement layer architecture
- Mobile navigation pattern
- Home page section structure and ordering
- Admin sidebar/navigation design
- Data table implementation (TanStack Table or alternatives)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PUB-01 | Home page with hero, services overview, gallery preview, booking CTA | UI spec defines layout, copy, hero headline, CTA text; Framer Motion for entrance animations |
| PUB-02 | Gallery with filtering by style, size, placement (masonry, lightbox, social sharing) | UI spec defines filter categories; CSS columns masonry; dialog-based lightbox; URL search params for filter state |
| PUB-03 | Services page with service cards, process steps, pricing info | Cal.com config has service definitions (consultation, design review, tattoo session, touch-up) that can inform content |
| PUB-04 | Booking flow via Cal.com embed | @calcom/embed-react 1.5.3 supports React 19; use client component wrapper; embed-only approach recommended |
| PUB-05 | Contact form with email notifications via Resend | Resend 6.9.4; port email templates from source repo; Server Action for form submission |
| PUB-06 | About page and FAQ with accordion | shadcn accordion component; static content pages |
| PUB-07 | SEO infrastructure (sitemaps, structured data, robots.txt, Open Graph) | Next.js metadata API, sitemap.ts, robots.ts patterns from source repo |
| PUB-08 | Mobile-responsive design with mobile navigation | Sheet/drawer hamburger pattern per UI spec; 768px breakpoint |
| PUB-09 | Performance optimization (code splitting, lazy loading, image optimization) | Next.js Image with AVIF/WebP; dynamic imports; ISR for gallery |
| ADMIN-01 | Dashboard overview with KPIs | Recharts 3.8.0 for charts; shadcn chart wrapper; DAL aggregate queries |
| ADMIN-02 | Customer management (CRUD, medical info, search/filter) | TanStack Table 8.21.3; react-hook-form 7.71.2 with Zod resolver; existing DAL customers module |
| ADMIN-03 | Appointment management (scheduling, status, filtering) | Existing DAL appointments module; shadcn calendar for date picking |
| ADMIN-04 | Tattoo session tracking | Existing TattooSession model with pricing, consent, aftercare fields |
| ADMIN-05 | Media/portfolio management (upload to Vercel Blob, gallery sync) | @vercel/blob 2.3.1; upload route handler pattern from source repo |
| ADMIN-06 | Analytics and reporting with charts | Recharts for revenue trends, client acquisition; DAL aggregate queries |
| ADMIN-07 | Settings management | Settings model exists in schema; key-value store pattern |
| ADMIN-08 | Audit logging of all admin actions | AuditLog model exists; wrap DAL mutations with audit helper |
| ADMIN-09 | RBAC on all admin routes and API endpoints | Authorization module from source repo; DAL already has requireStaffRole; add middleware layer |
| SEC-01 | CSRF protection on all mutation endpoints | Next.js Server Actions have built-in CSRF protection; custom CSRF only needed for Route Handlers |
| SEC-02 | Rate limiting on public endpoints | In-memory rate limiter pattern from source repo; apply to contact, auth endpoints |
| SEC-03 | Input sanitization and Zod validation on all API inputs | Zod 4.3.6 already installed; validate in Server Actions and Route Handlers |
| SEC-04 | Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) | next.config.ts headers() function; adapt security-headers.ts from source repo |
| SEC-06 | Zero-downtime deployment migration from existing domain | Vercel deployment; DNS cutover; downtime acceptable per user decision |
</phase_requirements>

## Standard Stack

### Core (already installed in Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.0 | Framework | Project foundation |
| react | 19.2.3 | UI library | Required by Next.js 16 |
| prisma | 7.5.0 | ORM | Database access through DAL |
| better-auth | 1.5.5 | Authentication | RBAC, session management |
| @tanstack/react-query | 5.91.3 | Server state | Data fetching pattern |
| zustand | 5.0.12 | Client state | UI state management |
| zod | 4.3.6 | Validation | Input validation everywhere |
| tailwindcss | 4.2.2 | Styling | CSS framework |
| shadcn | 4.1.0 | Component CLI | Install UI components |
| lucide-react | 0.462.0 | Icons | Icon library |
| sonner | 2.0.7 | Toasts | Notification system |
| date-fns | 4.1.0 | Date utils | Date formatting |

### New Dependencies (install for Phase 2)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | 12.38.0 | Animation | Public site entrance animations, hover effects |
| recharts | 3.8.0 | Charts | Admin analytics/dashboard charts (shadcn chart wrapper) |
| @tanstack/react-table | 8.21.3 | Data tables | Admin CRUD tables with sorting/filtering/pagination |
| react-hook-form | 7.71.2 | Forms | Admin form management (customer CRUD, settings) |
| @hookform/resolvers | 5.2.2 | Form validation | Connect Zod schemas to react-hook-form |
| resend | 6.9.4 | Email | Contact form notifications |
| @vercel/blob | 2.3.1 | File storage | Media/portfolio upload |
| @calcom/embed-react | 1.5.3 | Booking embed | Cal.com booking integration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Nivo, Chart.js | Recharts integrates directly with shadcn chart component; simpler API; smaller bundle |
| TanStack Table | AG Grid | TanStack Table is headless -- full styling control with shadcn; AG Grid is overkill for single-user admin |
| react-hook-form | Conform | react-hook-form has larger ecosystem, better docs; Conform is Server Action-native but less mature |
| In-memory rate limiter | Upstash Ratelimit | In-memory is fine for single Vercel instance; Upstash needed only for multi-region |

**Installation:**
```bash
npm install framer-motion@12.38.0 recharts@3.8.0 @tanstack/react-table@8.21.3 react-hook-form@7.71.2 @hookform/resolvers@5.2.2 resend@6.9.4 @vercel/blob@2.3.1 @calcom/embed-react@1.5.3
```

**shadcn components to install:**
```bash
npx shadcn add accordion alert-dialog avatar badge breadcrumb calendar card chart checkbox dialog dropdown-menu form input label pagination popover scroll-area select separator sheet sidebar skeleton switch table tabs textarea tooltip
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (public)/                    # Public site pages
│   │   ├── layout.tsx               # PublicNav + PublicFooter
│   │   ├── page.tsx                 # Home
│   │   ├── gallery/page.tsx         # Gallery with filtering
│   │   ├── services/page.tsx        # Services
│   │   ├── booking/page.tsx         # Cal.com embed
│   │   ├── contact/page.tsx         # Contact form
│   │   ├── about/page.tsx           # About
│   │   ├── faq/page.tsx             # FAQ
│   │   ├── sitemap.ts               # SEO sitemap
│   │   └── robots.ts                # SEO robots
│   ├── (dashboard)/dashboard/       # Admin pages
│   │   ├── layout.tsx               # AdminNav sidebar
│   │   ├── page.tsx                 # KPI overview
│   │   ├── customers/               # Customer CRUD
│   │   ├── appointments/            # Appointment management
│   │   ├── sessions/                # Session tracking
│   │   ├── media/                   # Media/portfolio
│   │   ├── analytics/               # Charts/reports
│   │   ├── settings/                # Studio settings
│   │   └── audit-log/               # Audit log viewer
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # Better Auth (exists)
│   │   ├── contact/route.ts         # Contact form (rate limited)
│   │   └── upload/route.ts          # Vercel Blob upload
│   └── layout.tsx                   # Root layout (exists)
├── components/
│   ├── ui/                          # shadcn primitives
│   ├── public/                      # Public site components
│   │   ├── public-nav.tsx
│   │   ├── public-footer.tsx
│   │   ├── hero-section.tsx
│   │   ├── service-card.tsx
│   │   ├── process-steps.tsx
│   │   ├── gallery-grid.tsx
│   │   ├── gallery-lightbox.tsx
│   │   ├── gallery-filter-bar.tsx
│   │   ├── cal-embed.tsx
│   │   └── contact-form.tsx
│   ├── dashboard/                   # Admin components
│   │   ├── admin-nav.tsx
│   │   ├── kpi-card.tsx
│   │   ├── data-table.tsx
│   │   ├── status-badge.tsx
│   │   ├── media-uploader.tsx
│   │   ├── analytics-chart.tsx
│   │   ├── search-input.tsx
│   │   └── audit-log-entry.tsx
│   └── providers.tsx                # TanStack Query + Zustand (exists)
├── lib/
│   ├── dal/                         # Data Access Layer (exists, expand)
│   │   ├── customers.ts             # Add update, delete, search
│   │   ├── appointments.ts          # Add CRUD, filtering
│   │   ├── designs.ts               # Already has public + admin queries
│   │   ├── sessions.ts              # NEW: tattoo session CRUD
│   │   ├── media.ts                 # NEW: media/portfolio CRUD
│   │   ├── analytics.ts             # NEW: aggregate queries
│   │   ├── settings.ts              # NEW: settings CRUD
│   │   ├── audit.ts                 # NEW: audit log write + read
│   │   └── contacts.ts              # NEW: contact form submissions
│   ├── actions/                     # Server Actions
│   │   ├── customer-actions.ts
│   │   ├── appointment-actions.ts
│   │   ├── session-actions.ts
│   │   ├── media-actions.ts
│   │   ├── settings-actions.ts
│   │   └── contact-actions.ts
│   ├── email/                       # Email service
│   │   ├── resend.ts                # Resend client
│   │   └── templates.ts             # Email HTML templates
│   ├── security/                    # Security infrastructure
│   │   ├── rate-limiter.ts          # In-memory rate limiter
│   │   ├── headers.ts               # Security headers config
│   │   └── validation.ts            # Shared Zod schemas
│   ├── auth.ts                      # Better Auth (exists)
│   ├── auth-client.ts               # Auth client (exists)
│   └── db.ts                        # Prisma client (exists)
└── middleware.ts                    # Auth + RBAC middleware
```

### Pattern 1: Server Action with Audit Logging
**What:** All admin mutations go through Server Actions that call DAL functions and log to audit trail.
**When to use:** Every admin write operation.
**Example:**
```typescript
// src/lib/actions/customer-actions.ts
'use server';

import { createCustomer, updateCustomer, deleteCustomer } from '@/lib/dal/customers';
import { logAudit } from '@/lib/dal/audit';
import { getCurrentSession } from '@/lib/auth';
import { z } from 'zod';
import { headers } from 'next/headers';

const CreateCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export async function createCustomerAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error('Unauthorized');

  const validated = CreateCustomerSchema.parse(Object.fromEntries(formData));
  const customer = await createCustomer(validated);

  const hdrs = await headers();
  await logAudit({
    userId: session.user.id,
    action: 'CREATE',
    resource: 'customer',
    resourceId: customer.id,
    ip: hdrs.get('x-forwarded-for') ?? 'unknown',
    userAgent: hdrs.get('user-agent') ?? 'unknown',
    metadata: { changes: validated },
  });

  return customer;
}
```

### Pattern 2: TanStack Query with Server Action Mutation
**What:** Client components fetch data with TanStack Query and mutate with Server Actions.
**When to use:** All admin CRUD pages.
**Example:**
```typescript
// Client component
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomerAction } from '@/lib/actions/customer-actions';

export function CustomerList() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/admin/customers').then(r => r.json()),
  });

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createCustomerAction(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
  // ...
}
```

### Pattern 3: Public Page with ISR
**What:** Public pages use Incremental Static Regeneration for performance.
**When to use:** Gallery, services, about, FAQ -- content that changes infrequently.
**Example:**
```typescript
// src/app/(public)/gallery/page.tsx
import { getPublicDesigns } from '@/lib/dal/designs';

export const revalidate = 1800; // 30 minutes

export default async function GalleryPage() {
  const designs = await getPublicDesigns();
  return <GalleryClient initialDesigns={designs} />;
}
```

### Pattern 4: Security Headers in next.config.ts
**What:** Set all security headers via Next.js config, not custom middleware.
**When to use:** Always -- this is the framework-native approach.
**Example:**
```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://app.cal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "frame-src 'self' https://app.cal.com",
      "connect-src 'self' https://api.cal.com",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

### Anti-Patterns to Avoid
- **Hand-rolling auth middleware for dashboard routes:** Use Next.js middleware.ts with the existing `getCurrentSession()` helper. Do not build custom auth wrappers around every page component.
- **Fetching data in client components without TanStack Query:** All client-side fetches must use `useQuery` for caching, deduplication, and stale-while-revalidate.
- **Putting auth checks in page components instead of DAL:** The DAL is the security boundary. Pages call DAL functions; DAL functions enforce auth.
- **Using Route Handlers for mutations that should be Server Actions:** Per project decisions, Server Actions for mutations, Route Handlers only for webhooks and upload endpoints.
- **Importing DAL modules in client components:** DAL files use `import 'server-only'` -- they cannot be imported in client code. Use Server Actions or API routes as the bridge.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data tables | Custom table with sorting/filter/pagination | TanStack Table + shadcn table | Handles virtualization, column resizing, complex filtering |
| Form management | Manual state tracking for complex forms | react-hook-form + Zod resolver | Handles validation, dirty tracking, error states, performance |
| Charts | SVG/canvas chart rendering | Recharts via shadcn chart component | Responsive, accessible, composable chart primitives |
| File upload | Custom multipart upload handling | @vercel/blob `put()` with streaming body | Handles large files, CDN, deduplication |
| CSRF for Server Actions | Custom CSRF token system | Next.js built-in (origin/host verification) | Server Actions have CSRF protection built-in since Next.js 14+ |
| Masonry layout | JavaScript-calculated grid | CSS `columns` property | Pure CSS, no layout shift, better performance |
| Image optimization | Custom sharp/imagemin pipeline | Next.js Image component | Automatic AVIF/WebP, lazy loading, srcset |
| Security headers | Custom middleware function | next.config.ts `headers()` | Framework-native, applied at edge, no runtime cost |
| Gallery lightbox | Custom modal with image navigation | shadcn dialog + custom gallery nav | Accessible, keyboard navigable, focus trapping |
| Toast notifications | Custom notification system | sonner (already installed) | Accessible, stackable, auto-dismiss |

**Key insight:** The source repos hand-rolled several of these (CSRF, security headers middleware, rate limiter). For the unified codebase, prefer framework-native solutions where available (security headers, CSRF) and proven libraries for the rest.

## Common Pitfalls

### Pitfall 1: Cal.com Embed CSP Conflicts
**What goes wrong:** Cal.com embed loads scripts and iframes from `app.cal.com` and `api.cal.com`. A strict CSP blocks these, causing a blank embed.
**Why it happens:** CSP defaults to `'self'` for frame-src and script-src.
**How to avoid:** Explicitly allow Cal.com domains in CSP: `frame-src 'self' https://app.cal.com; script-src 'self' 'unsafe-inline' https://app.cal.com; connect-src 'self' https://api.cal.com`.
**Warning signs:** Cal.com embed shows blank/white area; browser console shows CSP violation errors.

### Pitfall 2: Server Action CSRF Bypass (CVE-2026-27978)
**What goes wrong:** Requests from `origin: null` contexts (sandboxed iframes) can bypass Server Action CSRF validation.
**Why it happens:** Next.js treated null origin as "missing" instead of "cross-origin."
**How to avoid:** Ensure Next.js is at version 16.1.7 or above (current project is 16.2.0, which includes the fix).
**Warning signs:** N/A -- already patched in the installed version.

### Pitfall 3: Vercel Blob Upload Route Missing Auth
**What goes wrong:** Anyone can upload files to Vercel Blob via the upload route.
**Why it happens:** The source repo's upload route has no auth check.
**How to avoid:** Add `requireStaffRole()` check at the start of the upload Route Handler. Only authenticated admin users should upload.
**Warning signs:** Unauthenticated requests succeed in uploading files.

### Pitfall 4: TanStack Query Key Collisions
**What goes wrong:** Multiple pages use the same query key for different data shapes, causing stale data display.
**Why it happens:** Using generic keys like `['customers']` for both list and detail views.
**How to avoid:** Use structured query keys: `['customers', 'list', { page, filters }]` for lists and `['customers', 'detail', id]` for details.
**Warning signs:** Data from one page appearing on another; unexpected cache hits.

### Pitfall 5: ISR Revalidation vs Dynamic Gallery Filtering
**What goes wrong:** Gallery page uses ISR but filters need real-time results.
**Why it happens:** ISR caches the full page; search params change client-side but data is stale.
**How to avoid:** Two approaches: (1) Fetch all designs at build time, filter client-side (works for small portfolios). (2) Use client-side fetching with TanStack Query for filtered results, with ISR only for the initial page shell.
**Warning signs:** Filtering shows stale results or doesn't work at all.

### Pitfall 6: Framer Motion Bundle Size
**What goes wrong:** Importing framer-motion in every component bloats the client bundle.
**Why it happens:** framer-motion is ~32KB gzipped; importing in many components multiplies impact.
**How to avoid:** Use `motion` from `framer-motion` with tree-shaking. Import only in components that actually animate. Use CSS animations for simple transitions (hover, skeleton pulse). Framer Motion only for scroll-triggered reveals and staggered entrance animations.
**Warning signs:** Lighthouse performance score drops; large JS bundle in build output.

### Pitfall 7: Audit Log Write Failures Blocking Mutations
**What goes wrong:** If audit log insertion fails (DB error, constraint violation), the entire mutation fails even though the primary action succeeded.
**Why it happens:** Audit log write is in the same try/catch as the mutation.
**How to avoid:** Fire audit log writes as async operations that don't block the mutation response. Use try/catch specifically around the audit write with graceful failure (log error, don't throw).
**Warning signs:** Mutations intermittently fail with audit-related errors.

## Code Examples

### Cal.com Embed Component
```typescript
// src/components/public/cal-embed.tsx
'use client';

import Cal, { getCalApi } from '@calcom/embed-react';
import { useEffect } from 'react';

interface CalEmbedProps {
  calLink: string; // e.g., "username/consultation"
}

export function CalEmbed({ calLink }: CalEmbedProps) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('ui', {
        theme: 'light',
        styles: { branding: { brandColor: '#e8432b' } },
        hideEventTypeDetails: false,
      });
    })();
  }, []);

  return (
    <Cal
      calLink={calLink}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
      config={{ layout: 'month_view' }}
    />
  );
}
```

### Audit Log Helper
```typescript
// src/lib/dal/audit.ts
import 'server-only';
import { db } from '@/lib/db';

interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        ip: entry.ip,
        userAgent: entry.userAgent,
        metadata: entry.metadata ?? null,
      },
    });
  } catch (error) {
    // Never let audit failures block the primary operation
    console.error('Audit log write failed:', error);
  }
}

export async function getAuditLogs(filters?: {
  userId?: string;
  resource?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  return db.auditLog.findMany({
    where: {
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.resource && { resource: filters.resource }),
      ...(filters?.action && { action: filters.action }),
    },
    orderBy: { timestamp: 'desc' },
    take: filters?.limit ?? 50,
    skip: filters?.offset ?? 0,
    include: { user: { select: { name: true, email: true } } },
  });
}
```

### Resend Email Service
```typescript
// src/lib/email/resend.ts
import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = new Resend(env.RESEND_API_KEY);
const FROM_EMAIL = 'noreply@ink37tattoos.com';

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const adminEmail = env.ADMIN_EMAIL;

  // Send admin notification and customer confirmation in parallel
  const [adminResult, customerResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      replyTo: data.email,
      subject: `New Contact: ${data.name}`,
      html: `<h2>New Contact Form</h2><p><strong>Name:</strong> ${data.name}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Phone:</strong> ${data.phone ?? 'N/A'}</p><p><strong>Message:</strong></p><p>${data.message}</p>`,
    }),
    resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: 'Thank you for contacting Ink 37 Tattoos',
      html: `<h2>Hello ${data.name},</h2><p>Thank you for reaching out. We'll get back to you within 24 hours.</p><p>Best regards,<br>Ink 37 Tattoos</p>`,
    }),
  ]);

  return {
    adminSent: adminResult.status === 'fulfilled',
    customerSent: customerResult.status === 'fulfilled',
  };
}
```

### In-Memory Rate Limiter
```typescript
// src/lib/security/rate-limiter.ts
const store = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= maxRequests) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetTime) store.delete(key);
  }
}, 60_000);
```

### Middleware for Dashboard Auth
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dashboard routes require auth -- check for session token
  if (pathname.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get('better-auth.session_token');
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

## Cal.com Integration Decision

**Recommendation: Embed-only approach.**

The source repo has an overbuilt Cal.com integration with API client, webhook handling, v1/v2 dual support, and OAuth configuration. Most of this complexity is unnecessary for the actual use case (letting visitors book appointments).

**What to implement:**
1. `@calcom/embed-react` component wrapper for the booking page (PUB-04)
2. Cal.com username and event type slugs as environment variables
3. Service definitions as static data in the codebase (consultation, design review, tattoo session, touch-up) -- matching the UI spec service card content

**What NOT to port:**
- Cal.com API client class (not needed for embed-only)
- Webhook handling (defer to Phase 3 or later if actually needed)
- OAuth configuration (not needed for embed)
- Legacy v1 API functions

**Rationale:** The user explicitly said the original Cal.com integration was "half-assed." The embed approach is the simplest correct integration -- let Cal.com handle scheduling, display the booking widget, done. API integration only makes sense if we need to sync bookings to our DB, which is a Phase 3+ concern (appointment sync could accompany payment integration).

## Charting Library Decision

**Recommendation: Recharts 3.8.0.**

Recharts is the standard choice because:
1. shadcn includes a `chart` component that wraps Recharts -- zero additional wrapper work
2. Recharts is composable (AreaChart, BarChart, LineChart, PieChart as React components)
3. Admin only needs 3-4 chart types: area chart (revenue trends), bar chart (monthly bookings), line chart (client acquisition), pie chart (appointment types)
4. The source admin repo already uses Recharts -- patterns are proven for this exact domain

## Data Table Decision

**Recommendation: TanStack Table 8.21.3.**

TanStack Table is the correct choice because:
1. Headless -- full styling control with shadcn table primitives
2. Built-in sorting, filtering, pagination, column visibility
3. Works with any data source (DAL results, API responses)
4. shadcn has documented patterns for TanStack Table integration
5. The source admin repo already uses it

## RBAC Enforcement Decision

**Recommendation: Two-layer enforcement (middleware + DAL).**

1. **Middleware layer** (src/middleware.ts): Check session existence for `/dashboard` routes. Redirect to `/login` if no session. This is a fast check that prevents unauthenticated access.
2. **DAL layer** (existing pattern): `requireStaffRole()` / `requireAdminRole()` in every DAL function. This is the real security boundary -- it checks the actual user role against the required permission level.

The DAL layer already exists from Phase 1. The middleware layer is a lightweight addition. This matches the project's "auth checks in server-only DB functions, not just middleware" principle while still preventing unnecessary server component rendering for unauthenticated users.

**Port from source repo:** The `authorization.ts` module has a solid permission system (Role enum, Permission enum, role-permission mapping). Simplify and port the core functions (`hasPermission`, `hasRole`, `canAccessDashboard`) into the unified codebase. Drop the legacy compatibility code.

## Rate Limiting Decision

**Recommendation: Rate limit these endpoints:**

| Endpoint | Max Requests | Window | Why |
|----------|-------------|--------|-----|
| POST /api/contact | 5 | 15 min | Prevent contact form spam |
| POST /api/auth/* | 5 | 15 min | Prevent brute force login |
| POST /api/upload | 10 | 1 min | Prevent storage abuse |

**Implementation:** In-memory Map-based rate limiter (port simplified version from source repo). Vercel serverless functions share memory within a single instance, so this works for the expected traffic level. For future scaling, swap to Upstash Ratelimit.

## Gallery Filter Categories Decision

**Recommendation: Use the categories from the UI spec** (already decided during discuss phase):

- **Style:** Traditional, Neo-Traditional, Realism, Blackwork, Illustrative, Watercolor, Geometric, Japanese, Lettering, Minimalist
- **Placement:** Arm, Leg, Back, Chest, Shoulder, Ribs, Hand, Neck, Other
- **Size:** Small (<3"), Medium (3-6"), Large (6-12"), Extra Large (12"+)

These map directly to the `TattooDesign` model fields: `style` (designType), `size`, and the gallery needs a placement field. Since `TattooDesign.tags` is a string array, placement can be stored there or filtered from the design description. Better approach: designs already have `designType` for style; add filtering by `size` and use `tags` for placement.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom CSRF tokens for Server Actions | Built-in origin/host verification | Next.js 14+ | No custom CSRF needed for Server Actions |
| Middleware-based security headers | next.config.ts headers() | Always available | No runtime cost, framework-native |
| Cal.com embed via vanilla JS snippet | @calcom/embed-react React component | 2024 | Type-safe, React lifecycle integration |
| CSS Grid masonry (polyfill needed) | CSS columns for masonry | CSS columns stable | No JS needed for masonry layout |
| Custom image optimization | Next.js Image with AVIF/WebP | Next.js 13+ | Automatic format selection, lazy loading |

**Deprecated/outdated:**
- Cal.com API v1 (source repo uses both v1 and v2) -- v2 is current; but we don't need API access at all for embed-only
- `next-csrf` package -- unnecessary with Server Actions' built-in protection
- Custom security headers middleware function -- use next.config.ts instead

## Open Questions

1. **Cal.com Username/Event Type Configuration**
   - What we know: Source repo uses environment variables for Cal.com username and event type IDs
   - What's unclear: What are the actual Cal.com username and event type slugs for production?
   - Recommendation: Use environment variables (`NEXT_PUBLIC_CAL_USERNAME`, `NEXT_PUBLIC_CAL_CONSULTATION_SLUG`, etc.) and document required values

2. **Resend Domain Verification**
   - What we know: Source repo uses `noreply@ink37tattoos.com`
   - What's unclear: Is the domain verified in Resend? Is there an existing Resend API key?
   - Recommendation: Add `RESEND_API_KEY` and `ADMIN_EMAIL` to env validation schema

3. **Gallery Image Source**
   - What we know: TattooDesign model has `fileUrl` and `thumbnailUrl` pointing to Vercel Blob
   - What's unclear: Are there existing images in Vercel Blob, or is the gallery starting from scratch?
   - Recommendation: Support empty state (UI spec already defines empty gallery copy); images will be uploaded via admin media management

4. **Vercel Blob Token**
   - What we know: @vercel/blob requires `BLOB_READ_WRITE_TOKEN` environment variable
   - What's unclear: Is this configured in the deployment environment?
   - Recommendation: Add to env validation; uploads will fail gracefully with clear error if missing

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 |
| Config file | vitest.config.ts (needs creation or verification) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-05 | Contact form sends emails | unit | `npx vitest run tests/contact-form.test.ts -t "sends email"` | Wave 0 |
| PUB-07 | SEO metadata present | unit | `npx vitest run tests/seo.test.ts` | Wave 0 |
| ADMIN-08 | Audit log records mutations | unit | `npx vitest run tests/audit.test.ts` | Wave 0 |
| ADMIN-09 | RBAC blocks unauthorized access | unit | `npx vitest run tests/rbac.test.ts` | Wave 0 |
| SEC-01 | CSRF protection active | manual-only | N/A (Next.js built-in, verified by framework) | N/A |
| SEC-02 | Rate limiting blocks excess requests | unit | `npx vitest run tests/rate-limiter.test.ts` | Wave 0 |
| SEC-03 | Zod validation rejects bad input | unit | `npx vitest run tests/validation.test.ts` | Wave 0 |
| SEC-04 | Security headers present | unit | `npx vitest run tests/security-headers.test.ts` | Wave 0 |
| PUB-01 through PUB-04, PUB-06, PUB-08, PUB-09 | Page rendering | manual-only | Visual verification + Lighthouse | N/A |
| ADMIN-01 through ADMIN-07 | CRUD operations | integration | Manual verification in browser | N/A |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && npm run build`
- **Phase gate:** Full suite green + build succeeds + manual visual verification

### Wave 0 Gaps
- [ ] `tests/rate-limiter.test.ts` -- covers SEC-02
- [ ] `tests/audit.test.ts` -- covers ADMIN-08
- [ ] `tests/rbac.test.ts` -- covers ADMIN-09
- [ ] `tests/validation.test.ts` -- covers SEC-03
- [ ] `tests/contact-form.test.ts` -- covers PUB-05 email sending
- [ ] Verify vitest config exists and works with current setup

## Sources

### Primary (HIGH confidence)
- Project source code: `../tattoo-website/` and `../admin-tattoo-website/` -- examined actual implementations
- Phase 1 output: `src/lib/dal/`, `src/lib/auth.ts`, `prisma/schema.prisma` -- verified existing patterns
- UI Spec: `.planning/phases/02-public-site-admin-dashboard/02-UI-SPEC.md` -- approved design contract
- npm registry: verified versions for all recommended packages

### Secondary (MEDIUM confidence)
- [Next.js security docs](https://nextjs.org/docs/app/guides/data-security) -- Server Actions CSRF protection
- [Next.js headers config](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers) -- Security headers in next.config.ts
- [CVE-2026-27978](https://advisories.gitlab.com/pkg/npm/next/CVE-2026-27978/) -- Server Action CSRF bypass (fixed in 16.1.7+)
- [Cal.com embed-react npm](https://www.npmjs.com/package/@calcom/embed-react) -- React 19 peer dep support confirmed
- [Cal.com embed React 19 issues](https://github.com/calcom/cal.com/issues/20814) -- Compatibility tracking

### Tertiary (LOW confidence)
- Cal.com embed behavior with Next.js 16 specifically -- not directly tested; peer deps support React 19 but runtime behavior unverified
- In-memory rate limiter behavior on Vercel serverless -- expected to work within single instance but not across cold starts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm registry, compatible versions confirmed
- Architecture: HIGH -- patterns established in Phase 1, source repos provide proven domain patterns
- Pitfalls: HIGH -- identified from source code review, known CVEs, and Cal.com GitHub issues
- Cal.com integration: MEDIUM -- peer deps confirm React 19 support, but runtime behavior on Next.js 16 not directly verified
- Security: HIGH -- framework-native solutions well-documented; CVE addressed in installed version

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack, no fast-moving dependencies)
