# Phase 30: CSP Nonce Implementation - Research

**Researched:** 2026-04-05
**Domain:** Content Security Policy, Next.js 16 proxy.ts nonce generation, browser security headers
**Confidence:** HIGH

## Summary

Phase 30 closes INFRA-02, the only **unsatisfied** requirement from the v3.0 milestone audit. The proxy.ts file (27 lines) currently contains only auth redirect logic -- no nonce generation, no CSP header, no x-nonce propagation. Meanwhile, layout.tsx already reads `(await headers()).get('x-nonce')` and passes `nonce={nonce}` to the JSON-LD script, but the value is always `undefined` because no middleware sets it.

The implementation follows the official Next.js 16 proxy.ts pattern: generate a cryptographic nonce per request via `Buffer.from(crypto.randomUUID()).toString('base64')`, set it on both request headers (for downstream server components to read via `headers()`) and response headers (for browser CSP enforcement). The CSP header uses `'strict-dynamic'` in script-src so that scripts loaded by nonced scripts are automatically trusted, covering dynamically loaded chunks. For style-src, `'unsafe-inline'` must remain because Next.js injects inline styles for route announcer and client components (including chart.tsx which uses `<style dangerouslySetInnerHTML>`), and nonces cannot reliably cover all client-rendered inline styles in the current Next.js architecture.

**Primary recommendation:** Extend proxy.ts with nonce generation and dynamic CSP header emission. Use nonce-based script-src with `'strict-dynamic'`. Keep `'unsafe-inline'` in style-src as a pragmatic concession. Pass nonce to Providers/ThemeProvider. Remove static CSP from next.config.ts to avoid header duplication.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-02 | CSP tightened -- replace unsafe-inline/unsafe-eval with nonce-based CSP where possible | Nonce generation pattern verified from official Next.js 16 docs; proxy.ts extension pattern documented; third-party domain inventory complete; nonce propagation to layout.tsx/ThemeProvider/JSON-LD mapped |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Package manager:** bun (never npm/yarn/pnpm) -- use `bun add`, `bun run`
- **Framework:** Next.js 16.2.0 + React 19.2
- **Auth:** Better Auth with 5-tier RBAC
- **Hosting:** Vercel
- **UI:** Shadcn/Radix + Tailwind CSS 4
- **Booking:** Cal.com embed (@calcom/embed-react)
- **Monitoring:** Sentry (@sentry/nextjs 10.46.0)
- **GitOps middleware convention:** proxy.ts (NOT middleware.ts -- renamed in Next.js 16)
- **Supabase Auth:** Uses `getAll`/`setAll` cookie methods only (global instruction -- not directly relevant to this phase but noted)

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.0 | Framework -- proxy.ts runs nonce generation | Already installed; proxy.ts is the Next.js 16 request interception layer [VERIFIED: bun pm ls] |
| next-themes | 0.4.6 | Theme provider -- accepts `nonce` prop for inline script | Already installed; verified nonce prop exists in type definitions [VERIFIED: node_modules/next-themes/dist/index.d.ts line 45] |
| @sentry/nextjs | 10.46.0 | Error tracking -- needs CSP allowlist for connect-src | Already installed [VERIFIED: bun pm ls] |
| @calcom/embed-react | 1.5.3 | Booking embed -- loads external script from app.cal.com | Already installed; hardcoded default URL `https://app.cal.com/embed/embed.js` [VERIFIED: node_modules/@calcom/embed-react/dist/Cal.es.js] |

### No New Packages Required

This phase requires zero new dependencies. All CSP nonce functionality uses Node.js built-in `crypto` module and Next.js built-in `NextResponse` / `NextRequest` APIs.

## Architecture Patterns

### Current State (proxy.ts -- 27 lines)

```
proxy.ts
  export function proxy(request)
    - Check protected routes (/dashboard, /portal)
    - Redirect to login if no session cookie
    - Redirect logged-in users away from auth pages
    - Return NextResponse.next()
```

No matcher config exported. No CSP logic. No nonce generation.

### Target State (proxy.ts -- extended)

```
proxy.ts
  export function proxy(request)
    1. Generate nonce: Buffer.from(crypto.randomUUID()).toString('base64')
    2. Build CSP header string with nonce
    3. Clone request headers, set x-nonce
    4. Set Content-Security-Policy on request headers
    5. [EXISTING] Auth redirect logic (unchanged)
    6. Create response with modified request headers
    7. Set Content-Security-Policy on response headers
    8. Return response
```

### Nonce Propagation Flow

```
[proxy.ts]
  |-- generates nonce
  |-- sets x-nonce request header
  |-- sets CSP response header
  v
[Next.js SSR Engine]
  |-- parses CSP header, extracts nonce
  |-- auto-applies nonce to framework scripts and page bundles
  v
[layout.tsx (server component)]
  |-- reads (await headers()).get('x-nonce')
  |-- passes nonce to JSON-LD <script> tag
  |-- passes nonce to <Providers nonce={nonce}>
  v
[Providers (client component)]
  |-- forwards nonce to <ThemeProvider nonce={nonce}>
  v
[Browser]
  |-- enforces CSP: only scripts/styles with valid nonce execute
```

### CSP Directive Map

The following CSP directives are needed based on the project's actual third-party dependencies:

```
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic' https://app.cal.com;
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://*.public.blob.vercel-storage.com;
font-src 'self';
connect-src 'self' https://*.ingest.sentry.io https://app.cal.com https://api.cal.com;
frame-src 'self' https://app.cal.com;
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

**Directive-by-directive rationale:**

| Directive | Value | Reason |
|-----------|-------|--------|
| `script-src` | `'self' 'nonce-{N}' 'strict-dynamic' https://app.cal.com` | Nonce covers inline scripts; `strict-dynamic` trusts scripts loaded by nonced scripts (covers chunks); Cal.com embed loads external script [VERIFIED: embed source code] |
| `style-src` | `'self' 'unsafe-inline'` | **Cannot use nonce-only for styles** -- Next.js route announcer injects inline styles at runtime; chart.tsx client component uses `<style dangerouslySetInnerHTML>`; Tailwind style attributes on elements. Nonce cannot cover all these in current Next.js [CITED: https://github.com/vercel/next.js/issues/18557, https://github.com/vercel/next.js/issues/83764] |
| `img-src` | `'self' blob: data: https://*.public.blob.vercel-storage.com` | Vercel Blob for image storage; data: for inline SVGs; blob: for canvas operations |
| `font-src` | `'self'` | next/font/google self-hosts fonts at build time -- no external CDN needed [VERIFIED: src/styles/fonts.ts uses next/font/google] |
| `connect-src` | `'self' https://*.ingest.sentry.io https://app.cal.com https://api.cal.com` | Sentry error reporting; Cal.com API calls for booking embed [CITED: https://docs.sentry.io/platforms/javascript/guides/nextjs/security-policy-reporting/] |
| `frame-src` | `'self' https://app.cal.com` | Cal.com booking embed renders inside iframe [VERIFIED: @calcom/embed-react creates iframe] |
| `worker-src` | `'self' blob:` | Service worker (sw.js); Sentry Replay uses web workers [CITED: Sentry Session Replay docs] |
| `object-src` | `'none'` | No plugins needed; blocks Flash/Java applets |
| `frame-ancestors` | `'none'` | Replaces X-Frame-Options: DENY (already set in next.config.ts) |

### Development vs Production CSP

| Directive | Production | Development |
|-----------|-----------|-------------|
| `script-src` | `'self' 'nonce-{N}' 'strict-dynamic' https://app.cal.com` | Add `'unsafe-eval'` (React Fast Refresh, eval-based HMR) |
| `style-src` | `'self' 'unsafe-inline'` | Same (already permissive) |
| `connect-src` | As above | Add `ws://localhost:*` (HMR WebSocket) |

### Files That Must Change

| File | Change | Why |
|------|--------|-----|
| `proxy.ts` | Add nonce generation, CSP header construction, request/response header setting | Core implementation -- currently has zero CSP logic |
| `src/app/layout.tsx` | Pass `nonce` prop to `<Providers>` | ThemeProvider needs nonce for its inline script |
| `src/components/providers.tsx` | Accept `nonce` prop, forward to `<ThemeProvider nonce={nonce}>` | ThemeProvider CSP compliance |
| `next.config.ts` | Remove `/sw.js` CSP header from static `headers()` config | Avoid conflicting/duplicate CSP headers; dynamic CSP from proxy.ts supersedes |
| `src/components/public/breadcrumb-nav.tsx` | Add `nonce` prop to JSON-LD `<script>` | Currently has no nonce on inline script |
| `src/app/(public)/faq/page.tsx` | Add `nonce` prop to JSON-LD `<script>` | Currently has no nonce on inline script |

### Files That Do NOT Need Changes

| File | Why Safe |
|------|----------|
| `src/components/ui/chart.tsx` | Client component using `<style dangerouslySetInnerHTML>` -- covered by `'unsafe-inline'` in style-src; attempting nonce propagation here would add complexity without security benefit since style-src already allows inline |
| `sentry.client.config.ts` | Sentry SDK is bundled, not loaded via external script; `'strict-dynamic'` covers dynamically loaded chunks |
| `sentry.edge.config.ts` | Same as above |
| `src/components/web-vitals.tsx` | Client component loaded through bundle; covered by `'strict-dynamic'` |
| `src/components/public/cal-embed.tsx` | Cal.com domain explicitly in script-src and frame-src; embed script loaded via getCalApi() which is covered by bundle + strict-dynamic |

### Anti-Patterns to Avoid

- **Do NOT add `'unsafe-eval'` to production CSP** -- only for development (React debugging). Production eval is a XSS vector.
- **Do NOT use `'unsafe-inline'` in script-src** -- defeats the purpose of nonce-based CSP. `'unsafe-inline'` is ignored by browsers when nonces are present in script-src anyway. [CITED: MDN CSP spec]
- **Do NOT generate nonces with `Math.random()`** -- not cryptographically secure. Must use `crypto.randomUUID()`.
- **Do NOT set CSP in both proxy.ts and next.config.ts** -- headers merge/duplicate unpredictably. Use proxy.ts only for CSP.
- **Do NOT use `cacheComponents: true` with nonce-based CSP** -- they are fundamentally incompatible for inline `<head>` scripts. [CITED: https://github.com/vercel/next.js/issues/89754]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nonce generation | Custom crypto implementation | `Buffer.from(crypto.randomUUID()).toString('base64')` | Standard pattern from official Next.js docs; cryptographically secure; sufficient entropy [CITED: Next.js CSP guide] |
| CSP header parsing | String manipulation to extract nonces | Next.js built-in CSP nonce extraction | Next.js automatically parses CSP header and applies nonces to framework scripts [ASSUMED] |
| Theme flash prevention | Custom inline script | `next-themes` ThemeProvider with `nonce` prop | Already handles FOUC; has built-in nonce support [VERIFIED: next-themes v0.4.6 types] |

## Common Pitfalls

### Pitfall 1: Static Pages Lose CSP Nonces
**What goes wrong:** Pages that were previously statically rendered get stale/no nonces.
**Why it happens:** Nonces require per-request generation during SSR. Static pages have no request context.
**How to avoid:** The root layout already uses `await headers()` which forces dynamic rendering. This means the entire app is already dynamically rendered -- no action needed. [VERIFIED: layout.tsx line 105]
**Warning signs:** CSP violations in browser console for pages that should have nonces.

### Pitfall 2: Chart Component Inline Styles Blocked
**What goes wrong:** Shadcn chart component (`chart.tsx`) uses `<style dangerouslySetInnerHTML>` which could be blocked by strict style-src.
**Why it happens:** Client components render inline styles that cannot receive nonces from server context.
**How to avoid:** Keep `'unsafe-inline'` in style-src. This is the pragmatic approach used by most production Next.js apps. The security benefit of nonce-based script-src is far more important than style-src purity. [CITED: https://github.com/vercel/next.js/issues/18557]
**Warning signs:** Charts render without colors; CSP violation mentioning style-src in console.

### Pitfall 3: JSON-LD Scripts Missing Nonce
**What goes wrong:** Structured data `<script type="application/ld+json">` tags blocked by CSP.
**Why it happens:** While `type="application/ld+json"` scripts are not executed by the browser (they are data, not code), strict CSP implementations may still require nonces for all `<script>` tags.
**How to avoid:** Add `nonce={nonce}` to all inline `<script>` tags as a defensive measure. Three locations need this: layout.tsx (already has it), breadcrumb-nav.tsx, and faq/page.tsx.
**Warning signs:** Google Search Console reports missing structured data; CSP violation in browser console.

### Pitfall 4: Duplicate CSP Headers
**What goes wrong:** Browser receives two CSP headers -- one from proxy.ts (dynamic) and one from next.config.ts (static).
**Why it happens:** The current next.config.ts sets a CSP header for `/sw.js`. If proxy.ts also sets CSP, both apply. When multiple CSP headers exist, the browser enforces the **most restrictive union**.
**How to avoid:** Remove the static CSP from next.config.ts `headers()` function entirely. All CSP is handled by proxy.ts. The `/sw.js` route will inherit the global CSP from proxy.ts.
**Warning signs:** CSP violations even though the proxy.ts CSP seems correct; `curl -I` showing two Content-Security-Policy headers.

### Pitfall 5: ThemeProvider Script Blocked
**What goes wrong:** next-themes injects an inline `<script>` for FOUC prevention. Without a nonce, CSP blocks it, causing a flash of unstyled content or theme flickering.
**Why it happens:** ThemeProvider is a client component but its initialization script runs inline before hydration.
**How to avoid:** Pass `nonce` prop from layout.tsx through Providers to ThemeProvider. The Providers component must be updated to accept and forward the nonce. [VERIFIED: next-themes@0.4.6 has nonce prop]
**Warning signs:** Theme flickers on page load; CSP violation mentioning ThemeProvider inline script.

### Pitfall 6: Sentry Replay and CSP
**What goes wrong:** Sentry Session Replay (rrweb) may inject inline styles that violate CSP.
**Why it happens:** The Replay integration uses web workers and inline styles for session recording UI.
**How to avoid:** `worker-src 'self' blob:` covers the web worker. `'unsafe-inline'` in style-src covers the inline styles. If issues persist, Sentry provides a custom worker script that can be self-hosted. [CITED: https://github.com/getsentry/sentry-javascript/issues/10481]
**Warning signs:** Sentry Replay stops recording; CSP violations referencing rrweb or Sentry in console.

### Pitfall 7: Cal.com Embed Blocked
**What goes wrong:** Cal.com booking widget fails to load or iframe is blank.
**Why it happens:** @calcom/embed-react loads `https://app.cal.com/embed/embed.js` dynamically and creates an iframe to app.cal.com.
**How to avoid:** Include `https://app.cal.com` in both `script-src` and `frame-src`. Include `https://app.cal.com https://api.cal.com` in `connect-src`. [VERIFIED: embed source code shows hardcoded URL]
**Warning signs:** Booking page shows empty div where calendar should be; CSP violation mentioning app.cal.com.

## Code Examples

### Pattern 1: Nonce Generation in proxy.ts

```typescript
// Source: Official Next.js 16 CSP pattern + project-specific auth logic
import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/portal'];
const authPages = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate cryptographic nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Build CSP header
  const isDev = process.env.NODE_ENV === 'development';
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://app.cal.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
    "font-src 'self'",
    `connect-src 'self' https://*.ingest.sentry.io https://app.cal.com https://api.cal.com${isDev ? ' ws://localhost:*' : ''}`,
    "frame-src 'self' https://app.cal.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // Set nonce on request headers (for server components to read)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Auth redirect logic (existing)
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (protectedPrefixes.some(prefix => pathname.startsWith(prefix))) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }
  }

  if (authPages.some(page => pathname.startsWith(page))) {
    if (sessionToken) {
      const redirectResponse = NextResponse.redirect(
        new URL('/dashboard', request.url)
      );
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }
  }

  // Set CSP on response headers (for browser enforcement)
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}
```
[CITED: https://nextjs.org/docs/app/guides/content-security-policy, adapted for project structure]

### Pattern 2: Nonce Propagation in layout.tsx

```typescript
// Source: Existing layout.tsx pattern, extended
export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" className={...} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
```
[VERIFIED: layout.tsx line 105 already reads x-nonce]

### Pattern 3: Providers with Nonce

```typescript
// Source: Project providers.tsx, extended
'use client';

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  // ...existing state...
  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} nonce={nonce}>
          {children}
          <WebVitals />
          <Toaster position="bottom-right" richColors />
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
```
[VERIFIED: next-themes@0.4.6 ThemeProviderProps has nonce?: string]

### Pattern 4: JSON-LD with Nonce in Non-Layout Components

For components that render JSON-LD `<script>` tags outside the root layout (like breadcrumb-nav.tsx and faq/page.tsx), the nonce must be read from headers in a server component and passed down. Since these pages are server components, they can read headers directly:

```typescript
// In a server component (e.g., faq/page.tsx)
import { headers } from 'next/headers';

export default async function FAQPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      <BreadcrumbNav items={[...]} nonce={nonce} />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <FAQClient />
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for request interception | `proxy.ts` named export | Next.js 16 (2025) | File and function rename; runtime changed from Edge to Node.js [CITED: https://nextjs.org/docs/messages/middleware-to-proxy] |
| `'unsafe-inline'` in script-src | Nonce-based script-src with `'strict-dynamic'` | CSP Level 3 (widely adopted 2024+) | Blocks XSS via inline script injection |
| Google Fonts CDN in CSP (`fonts.googleapis.com`) | Self-hosted via `next/font` | Next.js 13+ (2022) | No external font requests; simpler CSP [VERIFIED: src/styles/fonts.ts] |
| Static CSP in next.config.ts | Dynamic CSP in proxy.ts | Next.js 16 (proxy-based) | Per-request nonces require dynamic generation |

**Deprecated/outdated:**
- `middleware.ts` filename (renamed to `proxy.ts` in Next.js 16) -- project already uses correct name
- Edge Runtime for middleware (proxy.ts runs on Node.js runtime in Next.js 16)
- `@next-safe/middleware` package (community wrapper; not needed with native proxy.ts support)

## Critical Finding: proxy.ts Is Not Wired as Active Middleware

**Discovery:** The `.next/server/middleware-manifest.json` shows `"middleware": {}, "sortedMiddleware": []` -- meaning proxy.ts is currently **NOT being intercepted by Next.js**. There is no `middleware.ts` file and the proxy.ts does not appear in the middleware manifest. [VERIFIED: filesystem check + manifest inspection]

**Implication:** The auth redirect logic in proxy.ts is also not active. This means:
1. Protected routes (/dashboard, /portal) may not be redirecting unauthenticated users at the middleware level
2. Adding CSP to proxy.ts will only work if Next.js recognizes it as the active proxy

**Possible causes:**
- Next.js 16 may require a different file location or export pattern for proxy.ts
- The `.next` build cache may be stale
- proxy.ts may need a `config` export with a `matcher` for Next.js to activate it

**Action required:** The plan must include verification that proxy.ts is actually being invoked by Next.js before adding CSP logic. If it is not active, the proxy must be activated first. This may require adding a `config` export with a matcher pattern. [ASSUMED -- needs runtime verification]

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js automatically parses CSP header and applies nonces to framework scripts | Don't Hand-Roll | If false, nonces would need manual application to all framework scripts -- significant additional work |
| A2 | proxy.ts needs a `config` export with matcher to become active | Critical Finding | If proxy.ts is already active (stale build cache), no action needed; if it truly needs activation, this is a prerequisite for all CSP work |
| A3 | `type="application/ld+json"` scripts need nonces despite not being executable | Pitfall 3 | If browsers do not enforce CSP on non-executable script types, nonces on JSON-LD are unnecessary (but harmless) |

## Open Questions

1. **Is proxy.ts currently active?**
   - What we know: middleware manifest shows empty middleware. proxy.ts exists at root. No middleware.ts exists.
   - What's unclear: Whether this is a stale build, a missing config export, or a Next.js 16 behavioral change.
   - Recommendation: Run `bun run dev`, hit a /dashboard route while logged out, check if redirect happens. If no redirect, proxy.ts is not active and must be fixed first.

2. **Do JSON-LD scripts really need nonces?**
   - What we know: `type="application/ld+json"` is not an executable script type. Browsers should not execute it.
   - What's unclear: Whether strict CSP implementations block ALL `<script>` tags without nonces, regardless of type.
   - Recommendation: Add nonces defensively. The cost is trivial and prevents any edge-case browser behavior.

3. **Will Sentry Session Replay work with the proposed CSP?**
   - What we know: Replay uses web workers (covered by `worker-src 'self' blob:`) and may inject inline styles (covered by `'unsafe-inline'` in style-src).
   - What's unclear: Whether there are additional CSP requirements for the Replay SDK.
   - Recommendation: Implement CSP, test with Sentry Replay enabled in dev, add domains to CSP if violations appear.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). This phase modifies only project source code files using Node.js built-in `crypto` module. No new tools, services, or CLI utilities needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via bun run test) |
| Config file | vitest.config.ts |
| Quick run command | `bun run test src/__tests__/csp.test.ts` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-02 | CSP header contains nonce, no unsafe-eval in production | unit | `bun run test src/__tests__/csp.test.ts -t "nonce"` | Wave 0 |
| INFRA-02 | CSP header includes required domains (cal.com, sentry) | unit | `bun run test src/__tests__/csp.test.ts -t "domains"` | Wave 0 |
| INFRA-02 | x-nonce header propagated to response | unit | `bun run test src/__tests__/csp.test.ts -t "propagation"` | Wave 0 |
| INFRA-02 | Auth redirects still include CSP headers | unit | `bun run test src/__tests__/csp.test.ts -t "redirect"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test src/__tests__/csp.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/csp.test.ts` -- covers INFRA-02 (nonce format, CSP directive content, no unsafe-eval in prod, domain allowlists, header propagation)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (proxy.ts auth logic already exists) |
| V3 Session Management | no | (not modified in this phase) |
| V4 Access Control | no | (not modified in this phase) |
| V5 Input Validation | no | (no user input processed) |
| V6 Cryptography | yes | `crypto.randomUUID()` for nonce generation -- Node.js built-in CSPRNG |
| V14 Configuration | yes | CSP header configuration; removal of unsafe-inline from script-src |

### Known Threat Patterns for CSP

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Inline script injection (XSS) | Tampering | Nonce-based script-src; `'strict-dynamic'` for trusted script chains |
| Style injection (CSS exfiltration) | Information Disclosure | `'unsafe-inline'` in style-src is pragmatic concession; nonce-based would be ideal but not feasible with current Next.js |
| Clickjacking | Spoofing | `frame-ancestors 'none'` (replaces X-Frame-Options: DENY) |
| Plugin-based attacks | Tampering | `object-src 'none'` blocks Flash/Java applets |
| Data exfiltration via fetch | Information Disclosure | Restrictive `connect-src` limits allowed API endpoints |

## Sources

### Primary (HIGH confidence)
- [proxy.ts source code] - 27 lines, auth redirect only, no CSP logic [VERIFIED: filesystem read]
- [layout.tsx source code] - Already reads x-nonce header on line 105 [VERIFIED: filesystem read]
- [next.config.ts source code] - Static CSP only for /sw.js [VERIFIED: filesystem read]
- [next-themes v0.4.6 type definitions] - `nonce?: string` prop confirmed [VERIFIED: node_modules inspection]
- [@calcom/embed-react v1.5.3 source] - Hardcoded `https://app.cal.com/embed/embed.js` default URL [VERIFIED: dist/Cal.es.js]
- [.next/server/middleware-manifest.json] - Empty middleware configuration [VERIFIED: filesystem read]
- [Phase 25 research] - Prior CSP nonce research (implementation was never executed) [VERIFIED: 25-RESEARCH.md]

### Secondary (MEDIUM confidence)
- [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) - Official documentation for nonce-based CSP (URL confirmed but content fetch failed due to LLM digest redirect)
- [Next.js proxy.ts documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) - proxy.ts replaces middleware.ts in Next.js 16
- [Sentry CSP reporting docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/security-policy-reporting/) - connect-src requirements for Sentry
- [next-themes nonce issue](https://github.com/pacocoursey/next-themes/issues/36) - Historical context on nonce support
- [Next.js inline styles CSP issue](https://github.com/vercel/next.js/issues/18557) - Why style-src needs unsafe-inline
- [Next.js route announcer CSP issue](https://github.com/vercel/next.js/issues/83764) - Route announcer inline styles
- [Sentry rrweb CSP issue](https://github.com/getsentry/sentry-javascript/issues/10481) - Replay SDK CSP requirements
- [Next.js cacheComponents CSP incompatibility](https://github.com/vercel/next.js/issues/89754) - Not relevant (cacheComponents not enabled)

### Tertiary (LOW confidence)
- [centralcsp.com Next.js guide](https://centralcsp.com/articles/how-to-setup-nonce-with-nextjs) - Community guide, cross-verified with official docs
- Cal.com CSP requirements -- inferred from embed source code analysis, not from official Cal.com documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; all libraries verified in node_modules
- Architecture: HIGH -- proxy.ts nonce pattern well-documented in Next.js 16; prior Phase 25 research confirmed approach; third-party domain inventory complete from source code analysis
- Pitfalls: HIGH -- seven pitfalls identified from official issues, community reports, and source code analysis; chart.tsx and next-themes nonce challenges verified against actual code
- Critical finding (proxy.ts activation): MEDIUM -- manifest evidence is strong but could be stale build; runtime verification needed

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain -- CSP standards and Next.js 16 proxy pattern are unlikely to change)
