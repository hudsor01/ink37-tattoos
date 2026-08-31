import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { isFrameworkSignal } from '@/lib/auth-guard';
import { rateLimiters, getRequestIp } from '@/lib/security/rate-limiter';

/**
 * POST /api/csp-report -- receives Content-Security-Policy violation reports.
 *
 * WHY THIS EXISTS
 * Six separate CSP breakages shipped to production in this codebase before
 * anyone noticed, every one found by a human seeing something look wrong:
 * `'strict-dynamic'` blanking the entire site, the Cal.com booking embed and
 * its webfont blocked, Vercel Blob uploads failing, the Google Maps embed
 * rendering empty, and dev HMR dead over LAN/Tailscale. Tests assert the
 * CURRENT allowlist; they cannot catch the next host someone forgets. A
 * report endpoint is the one mechanism that generalizes.
 *
 * WHY FIRST-PARTY RATHER THAN POINTING report-uri AT SENTRY
 * Sentry's CSP ingest is a separate URL keyed to the DSN, and
 * NEXT_PUBLIC_SENTRY_DSN is optional here (env.ts) -- so a Sentry-only
 * endpoint would silently report nothing whenever it is unset, which is
 * exactly the failure mode being designed against. This route always logs,
 * and additionally forwards to Sentry when it is configured.
 *
 * REPORT FORMATS
 * Browsers send two shapes and this handles both:
 *   - `report-uri` (legacy, still the widest support):
 *     Content-Type application/csp-report, body { "csp-report": {...} }
 *   - `report-to` / Reporting API (modern):
 *     Content-Type application/reports+json, body [{ type, body: {...} }, ...]
 *
 * Always returns 204. A report endpoint that 4xx's teaches the browser to
 * stop sending, and there is no caller to benefit from an error body.
 */

/** Fields we keep. Everything else in a report is noise or PII-adjacent. */
interface CspViolation {
  documentUri?: string;
  violatedDirective?: string;
  effectiveDirective?: string;
  blockedUri?: string;
  sourceFile?: string;
  lineNumber?: number;
  disposition?: string;
}

function fromLegacy(r: Record<string, unknown>): CspViolation {
  return {
    documentUri: r['document-uri'] as string | undefined,
    violatedDirective: r['violated-directive'] as string | undefined,
    effectiveDirective: r['effective-directive'] as string | undefined,
    blockedUri: r['blocked-uri'] as string | undefined,
    sourceFile: r['source-file'] as string | undefined,
    lineNumber: r['line-number'] as number | undefined,
    disposition: r.disposition as string | undefined,
  };
}

function fromReportingApi(b: Record<string, unknown>): CspViolation {
  return {
    documentUri: b.documentURL as string | undefined,
    violatedDirective: b.effectiveDirective as string | undefined,
    effectiveDirective: b.effectiveDirective as string | undefined,
    blockedUri: b.blockedURL as string | undefined,
    sourceFile: b.sourceFile as string | undefined,
    lineNumber: b.lineNumber as number | undefined,
    disposition: b.disposition as string | undefined,
  };
}

/**
 * Reports whose blockedUri names a browser-extension scheme. These are the
 * dominant source of noise on any public site -- a visitor's extension
 * injecting a script is not a defect in this policy -- and are dropped.
 */
const EXTENSION_SCHEMES = [
  'chrome-extension',
  'moz-extension',
  'safari-extension',
  'safari-web-extension',
  'webkit-masked-url',
];

function isExtensionNoise(v: CspViolation): boolean {
  const uri = (v.blockedUri ?? '').toLowerCase();
  const src = (v.sourceFile ?? '').toLowerCase();
  return EXTENSION_SCHEMES.some((s) => uri.startsWith(s) || src.startsWith(s));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getRequestIp(request);
    const { success } = await rateLimiters.cspReport.limit(ip);
    if (!success) {
      // 204 even when throttled: a 429 would train the browser to back off
      // from an endpoint we want reporting freely once the burst passes.
      return new NextResponse(null, { status: 204 });
    }

    const raw: unknown = await request.json();

    const violations: CspViolation[] = Array.isArray(raw)
      ? raw
          .filter(
            (r): r is { type?: string; body: Record<string, unknown> } =>
              !!r && typeof r === 'object' && 'body' in r
          )
          .filter((r) => r.type === undefined || r.type === 'csp-violation')
          .map((r) => fromReportingApi(r.body))
      : raw && typeof raw === 'object' && 'csp-report' in raw
        ? [fromLegacy((raw as Record<string, Record<string, unknown>>)['csp-report'])]
        : [];

    for (const v of violations) {
      if (isExtensionNoise(v)) continue;

      logger.warn(
        {
          csp: v,
          userAgent: request.headers.get('user-agent') ?? undefined,
        },
        'CSP violation reported'
      );

      // Sentry gets a message rather than an exception: these are policy
      // events, not thrown errors, and grouping by directive + blocked host
      // keeps one misconfigured host to a single issue instead of one per
      // page view.
      Sentry.captureMessage(
        `CSP: ${v.effectiveDirective ?? v.violatedDirective ?? 'unknown'} blocked ${v.blockedUri ?? 'unknown'}`,
        {
          level: 'warning',
          tags: {
            csp_directive: v.effectiveDirective ?? v.violatedDirective ?? 'unknown',
            csp_blocked_uri: v.blockedUri ?? 'unknown',
            csp_disposition: v.disposition ?? 'enforce',
          },
          extra: { ...v },
        }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Route-handler rule (CLAUDE.md): re-throw framework signals so
    // redirect()/notFound() thrown deeper are not swallowed into a 500.
    if (isFrameworkSignal(error)) throw error;
    // Malformed body, bad JSON, Sentry hiccup -- never surface an error to a
    // browser posting a report. Log and acknowledge.
    logger.error({ err: error }, 'Failed to process CSP violation report');
    return new NextResponse(null, { status: 204 });
  }
}
