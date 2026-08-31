import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLimit = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();
const mockCaptureMessage = vi.fn();

vi.mock('server-only', () => ({}));

// setup.ts partially mocks next/server, leaving NextResponse non-constructible.
// This route returns bare `new NextResponse(null, {status:204})`, so it needs
// the real class -- same restore csp.test.ts performs.
vi.mock('next/server', async () => await vi.importActual('next/server'));

vi.mock('@/lib/security/rate-limiter', () => ({
  rateLimiters: { cspReport: { limit: (...a: unknown[]) => mockLimit(...a) } },
  getRequestIp: () => '203.0.113.1',
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: (...a: unknown[]) => mockWarn(...a),
    error: (...a: unknown[]) => mockError(...a),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...a: unknown[]) => mockCaptureMessage(...a),
}));

import { POST } from '@/app/api/csp-report/route';

function post(body: unknown, contentType = 'application/csp-report') {
  return new Request('http://localhost:3000/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': contentType, 'user-agent': 'test-agent' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * Six CSP breakages reached production here before a human noticed. This
 * endpoint is the signal that generalizes past the current allowlist, so it
 * has to be robust: browsers send two different payload shapes, send them
 * with no credentials, and stop reporting to endpoints that error.
 */
describe('POST /api/csp-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ success: true, reset: 0 });
  });

  /** The legacy `report-uri` shape -- still the only one Safari sends. */
  it('parses a legacy csp-report payload', async () => {
    const res = await POST(
      post({
        'csp-report': {
          'document-uri': 'https://ink37tattoos.com/booking',
          'violated-directive': 'font-src',
          'effective-directive': 'font-src',
          'blocked-uri': 'https://cal.com/cal.ttf',
          disposition: 'enforce',
        },
      })
    );
    expect(res.status).toBe(204);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    const [msg, opts] = mockCaptureMessage.mock.calls[0] as [
      string,
      { tags: Record<string, string> },
    ];
    expect(msg).toContain('font-src');
    expect(msg).toContain('https://cal.com/cal.ttf');
    expect(opts.tags.csp_directive).toBe('font-src');
    expect(opts.tags.csp_blocked_uri).toBe('https://cal.com/cal.ttf');
  });

  /** The modern Reporting API shape -- an array, camelCase keys. */
  it('parses a reports+json payload', async () => {
    const res = await POST(
      post(
        [
          {
            type: 'csp-violation',
            body: {
              documentURL: 'https://ink37tattoos.com/',
              effectiveDirective: 'script-src',
              blockedURL: 'https://evil.example/x.js',
              disposition: 'enforce',
            },
          },
        ],
        'application/reports+json'
      )
    );
    expect(res.status).toBe(204);
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    expect(mockCaptureMessage.mock.calls[0][0]).toContain('script-src');
  });

  it('handles a batch of reports in one request', async () => {
    const one = (d: string) => ({
      type: 'csp-violation',
      body: { effectiveDirective: d, blockedURL: `https://x/${d}` },
    });
    const res = await POST(
      post([one('img-src'), one('media-src')], 'application/reports+json')
    );
    expect(res.status).toBe(204);
    expect(mockCaptureMessage).toHaveBeenCalledTimes(2);
  });

  /**
   * Browser extensions injecting scripts are the dominant source of reports
   * on any public site and are not defects in this policy. Left unfiltered
   * they bury the real signal.
   */
  it.each([
    'chrome-extension://abc/inject.js',
    'moz-extension://abc/inject.js',
    'safari-web-extension://abc/x.js',
  ])('drops extension noise (%s)', async (blocked) => {
    const res = await POST(
      post({ 'csp-report': { 'blocked-uri': blocked, 'violated-directive': 'script-src' } })
    );
    expect(res.status).toBe(204);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('drops extension noise identified by source-file', async () => {
    await POST(
      post({
        'csp-report': {
          'blocked-uri': 'inline',
          'source-file': 'chrome-extension://abc/content.js',
          'violated-directive': 'script-src',
        },
      })
    );
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  /**
   * A report endpoint that 4xx's or 5xx's teaches the browser to stop
   * sending, which would disable the signal permanently. It must always
   * acknowledge.
   */
  it('returns 204 on malformed JSON instead of erroring', async () => {
    const res = await POST(post('{not json', 'application/csp-report'));
    expect(res.status).toBe(204);
    expect(mockError).toHaveBeenCalled();
  });

  it('returns 204 on an unrecognized body shape', async () => {
    const res = await POST(post({ unexpected: true }));
    expect(res.status).toBe(204);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('returns 204 when rate limited, and reports nothing', async () => {
    mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 1000 });
    const res = await POST(
      post({ 'csp-report': { 'violated-directive': 'script-src' } })
    );
    // 204 not 429: a 429 would train the browser to back off from an
    // endpoint we want reporting freely once the burst passes.
    expect(res.status).toBe(204);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('still returns 204 if Sentry throws', async () => {
    mockCaptureMessage.mockImplementation(() => {
      throw new Error('sentry down');
    });
    const res = await POST(
      post({ 'csp-report': { 'violated-directive': 'img-src', 'blocked-uri': 'https://x/y.png' } })
    );
    expect(res.status).toBe(204);
    expect(mockError).toHaveBeenCalled();
  });
});
