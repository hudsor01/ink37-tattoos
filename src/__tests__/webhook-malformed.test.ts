import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// ============================================================================
// STRIPE MOCKS
// ============================================================================
const mockConstructEvent = vi.fn();
const mockStripeFindFirst = vi.fn();
const mockInsertValues = vi.fn().mockReturnThis();
const mockInsertReturning = vi.fn();
const mockOnConflictDoNothing = vi.fn();
const mockInsert = vi.fn((_table?: unknown) => ({
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return {
      onConflictDoNothing: (...ocArgs: unknown[]) => {
        mockOnConflictDoNothing(...ocArgs);
        return {
          returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs),
        };
      },
      returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs),
    };
  },
}));

// ============================================================================
// CAL.COM MOCKS
// ============================================================================
const mockVerifyCalSignature = vi.fn();
const mockCustomerFindFirst = vi.fn();
const mockSettingsFindFirst = vi.fn();
const mockCalInsertValues = vi.fn();
const mockCalInsertOnConflict = vi.fn();
const mockCalInsertReturning = vi.fn();
const mockCalUpdateSet = vi.fn();
const mockCalUpdateWhere = vi.fn();
const mockCalUpdateReturning = vi.fn();

// ============================================================================
// MODULE MOCKS
// ============================================================================
vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-chars-long',
    BETTER_AUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: {},
  getCurrentSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/email/resend', () => ({
  sendContactNotification: vi.fn(),
  sendPaymentRequestEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
  sendGiftCardEmail: vi.fn(),
  sendGiftCardPurchaseConfirmationEmail: vi.fn(),
}));

vi.mock('@/lib/dal/orders', () => ({
  getOrderByCheckoutSessionId: vi.fn(),
}));

vi.mock('@/lib/dal/gift-cards', () => ({
  createGiftCard: vi.fn(),
  redeemGiftCard: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
  ilike: vi.fn((...args: unknown[]) => args),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => {
      const status = init?.status ?? 200;
      return {
        status,
        json: async () => data,
      };
    },
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
    paymentIntents: { retrieve: vi.fn() },
    charges: { retrieve: vi.fn() },
  },
  stripeCentsToDollars: (cents: number) => cents / 100,
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      stripeEvent: {
        findFirst: (...args: unknown[]) => mockStripeFindFirst(...args),
      },
      payment: {
        findFirst: vi.fn(),
      },
      customer: {
        findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
      },
      settings: {
        findFirst: (...args: unknown[]) => mockSettingsFindFirst(...args),
      },
    },
    insert: (table: unknown) => mockInsert(table),
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockCalUpdateSet(...args);
        return {
          where: (...wArgs: unknown[]) => {
            mockCalUpdateWhere(...wArgs);
            return {
              returning: () => mockCalUpdateReturning(),
            };
          },
        };
      },
    })),
    transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        update: vi.fn(() => ({
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        })),
      };
      return fn(tx);
    }),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  stripeEvent: { stripeEventId: 'stripeEventId', id: 'id', type: 'type', processedAt: 'processedAt' },
  payment: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId', stripePaymentIntentId: 'stripePaymentIntentId', status: 'status', tattooSessionId: 'tattooSessionId', completedAt: 'completedAt', receiptUrl: 'receiptUrl' },
  tattooSession: { id: 'id', paidAmount: 'paidAmount' },
  order: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId', status: 'status' },
  appointment: { calBookingUid: 'calBookingUid', customerId: 'customerId', id: 'id', status: 'status' },
  customer: { email: 'email', id: 'id' },
  settings: { key: 'key' },
  appointmentTypeEnum: {
    enumValues: ['CONSULTATION', 'DESIGN_REVIEW', 'TATTOO_SESSION', 'TOUCH_UP', 'REMOVAL'],
  },
}));

vi.mock('@/lib/cal/verify', () => ({
  verifyCalSignature: (...args: unknown[]) => mockVerifyCalSignature(...args),
}));

vi.mock('@/lib/security/rate-limiter', () => ({
  rateLimiters: {
    webhook: { limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }) },
  },
  getRequestIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn().mockReturnValue(Response.json({ error: 'Too many requests' }, { status: 429 })),
  rateLimit: vi.fn().mockReturnValue(true),
}));

// ============================================================================
// HELPERS
// ============================================================================

function makeStripeRequest(body: string, sig: string | null = 'valid_sig'): Request {
  const headers: Record<string, string> = {};
  if (sig) headers['stripe-signature'] = sig;
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  });
}

function makeCalRequest(body: string, sig: string | null = 'valid_sig'): Request {
  const headers: Record<string, string> = {};
  if (sig) headers['x-cal-signature-256'] = sig;
  return new Request('http://localhost/api/webhooks/cal', {
    method: 'POST',
    body,
    headers,
  });
}

const RESEND_SECRET = 'whsec_dGVzdC1zZWNyZXQ=';

function computeResendSig(body: string, svixId: string, svixTimestamp: string): string {
  const secretBytes = Buffer.from(RESEND_SECRET.slice(6), 'base64');
  const toSign = `${svixId}.${svixTimestamp}.${body}`;
  const sig = createHmac('sha256', secretBytes).update(toSign).digest('base64');
  return `v1,${sig}`;
}

function makeResendRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers,
  });
}

// ============================================================================
// STRIPE MALFORMED PAYLOAD TESTS
// ============================================================================

describe('Stripe Webhook Malformed Payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeFindFirst.mockResolvedValue(null);
  });

  it('returns 400 for empty body with missing stripe-signature', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const response = await POST(makeStripeRequest('', null));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing stripe-signature header');
  });

  it('returns 400 when constructEvent throws on malformed JSON', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Unexpected token');
    });

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const response = await POST(makeStripeRequest('not-valid-json{{{'));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid signature');
  });

  it('returns 400 when constructEvent throws on empty body', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const response = await POST(makeStripeRequest(''));
    expect(response.status).toBe(400);
  });

  it('handles event with null data.object gracefully (returns 200 for unknown event type)', async () => {
    const malformedEvent = {
      id: 'evt_malformed_1',
      type: 'unknown.event.type',
      data: { object: null },
    };
    mockConstructEvent.mockReturnValue(malformedEvent as never);
    mockInsertReturning.mockResolvedValue([]);

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const response = await POST(makeStripeRequest(JSON.stringify(malformedEvent)));
    // Unknown event type is not handled by switch, so it proceeds to insert and return 200
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.received).toBe(true);
  });

  it('handles checkout.session.completed with missing metadata gracefully', async () => {
    const eventWithNoMetadata = {
      id: 'evt_no_metadata',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test',
          metadata: {},
          amount_total: 0,
          payment_intent: null,
        },
      },
    };
    mockConstructEvent.mockReturnValue(eventWithNoMetadata as never);
    mockInsertReturning.mockResolvedValue([]);

    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await POST(makeStripeRequest(JSON.stringify(eventWithNoMetadata)));
    errorSpy.mockRestore();
    // Without tattooSessionId in metadata, it logs error and continues, returning 200
    expect(response.status).toBe(200);
  });

  it('concurrent duplicate Stripe events -- second is idempotent', async () => {
    const event = {
      id: 'evt_duplicate_test',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          metadata: { tattooSessionId: 'sess_1' },
        },
      },
    };

    mockConstructEvent.mockReturnValue(event as never);

    // First call: event not yet processed
    let callCount = 0;
    mockStripeFindFirst.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return null; // not processed
      // Second call: already processed
      return { id: '1', stripeEventId: 'evt_duplicate_test', type: 'payment_intent.succeeded', processedAt: new Date() };
    });
    mockInsertReturning.mockResolvedValue([]);

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const [resp1, resp2] = await Promise.all([
      POST(makeStripeRequest(JSON.stringify(event))),
      POST(makeStripeRequest(JSON.stringify(event))),
    ]);

    // Both should return 200 (first processes, second skips as already processed)
    expect(resp1.status).toBe(200);
    expect(resp2.status).toBe(200);
  });
});

// ============================================================================
// CAL.COM MALFORMED PAYLOAD TESTS
// ============================================================================

describe('Cal.com Webhook Malformed Payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAL_WEBHOOK_SECRET = 'cal_test_secret';
    mockVerifyCalSignature.mockReturnValue(true);
    mockSettingsFindFirst.mockResolvedValue({ value: {} });
    mockCalInsertReturning.mockResolvedValue([{ id: 'new-customer-id' }]);
    mockCalUpdateReturning.mockResolvedValue([{ id: 'apt-id' }]);
  });

  afterEach(() => {
    delete process.env.CAL_WEBHOOK_SECRET;
  });

  it('returns 400 for empty JSON object (missing all required fields)', async () => {
    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify({})));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid payload');
  });

  it('returns 400 for payload with only partial fields', async () => {
    const payload = { triggerEvent: 'BOOKING_CREATED' };
    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify(payload)));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid payload');
  });

  it('returns 400 when triggerEvent is missing', async () => {
    const payload = {
      createdAt: new Date().toISOString(),
      payload: {
        uid: 'uid-1',
        bookingId: 1,
        eventTypeId: 42,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        length: 60,
        attendees: [{ name: 'John', email: 'j@t.com', timeZone: 'UTC', language: { locale: 'en' } }],
      },
    };

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify(payload)));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid payload');
  });

  it('returns 400 when attendees array is empty', async () => {
    const payload = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: new Date().toISOString(),
      payload: {
        uid: 'uid-1',
        bookingId: 1,
        eventTypeId: 42,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        length: 60,
        attendees: [],
      },
    };

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify(payload)));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid payload');
  });

  it('returns 400 when triggerEvent has invalid value', async () => {
    const payload = {
      triggerEvent: 'INVALID_EVENT_TYPE',
      createdAt: new Date().toISOString(),
      payload: {
        uid: 'uid-1',
        bookingId: 1,
        eventTypeId: 42,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        length: 60,
        attendees: [{ name: 'John', email: 'j@t.com', timeZone: 'UTC', language: { locale: 'en' } }],
      },
    };

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify(payload)));
    expect(response.status).toBe(400);
  });

  it('returns 400 when required fields have wrong types', async () => {
    const payload = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: new Date().toISOString(),
      payload: {
        uid: 12345, // Should be string
        bookingId: 'not-a-number', // Should be number
        eventTypeId: 42,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        length: 60,
        attendees: [{ name: 'John', email: 'j@t.com', timeZone: 'UTC', language: { locale: 'en' } }],
      },
    };

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify(payload)));
    expect(response.status).toBe(400);
  });

  it('returns 400 when payload.uid is empty string', async () => {
    const payload = {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: new Date().toISOString(),
      payload: {
        uid: '', // min(1) requires non-empty
        bookingId: 1,
        eventTypeId: 42,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        length: 60,
        attendees: [{ name: 'John', email: 'j@t.com', timeZone: 'UTC', language: { locale: 'en' } }],
      },
    };

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeCalRequest(JSON.stringify(payload)));
    expect(response.status).toBe(400);
  });
});

// ============================================================================
// RESEND MALFORMED PAYLOAD TESTS
// ============================================================================

describe('Resend Webhook Malformed Payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = RESEND_SECRET;
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it('returns 400 for invalid JSON body (when signature check passes)', async () => {
    const badBody = 'definitely not json {{';
    const svixId = 'msg_bad';
    const svixTimestamp = '1234567890';
    const signature = computeResendSig(badBody, svixId, svixTimestamp);

    // Import top-level since resend route uses top-level import
    const { POST } = await import('@/app/api/webhooks/resend/route');
    const response = await POST(makeResendRequest(badBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': signature,
    }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid JSON');
  });

  it('returns 200 for event with missing type field (no-op handler)', async () => {
    // No secret configured -- skips sig check
    delete process.env.RESEND_WEBHOOK_SECRET;

    const body = JSON.stringify({ data: { to: ['user@test.com'] } });
    const { POST } = await import('@/app/api/webhooks/resend/route');
    const response = await POST(makeResendRequest(body));
    // Missing type means no switch case matches, but still returns 200
    expect(response.status).toBe(200);
  });

  it('returns 200 for event with null data (graceful no-op)', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const body = JSON.stringify({ type: 'email.bounced', data: null });
    const { POST } = await import('@/app/api/webhooks/resend/route');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await POST(makeResendRequest(body));
    warnSpy.mockRestore();
    // data?.to?.[0] safely returns undefined, so no log but still 200
    expect(response.status).toBe(200);
  });

  it('returns 200 for event with empty to array', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const body = JSON.stringify({ type: 'email.bounced', data: { to: [] } });
    const { POST } = await import('@/app/api/webhooks/resend/route');
    const response = await POST(makeResendRequest(body));
    expect(response.status).toBe(200);
  });

  it('returns 401 for empty body when signature verification is enabled', async () => {
    const { POST } = await import('@/app/api/webhooks/resend/route');
    const response = await POST(makeResendRequest('', {
      'svix-id': 'msg_empty',
      'svix-timestamp': '1234567890',
      'svix-signature': 'v1,invalidsig==',
    }));
    expect(response.status).toBe(401);
  });
});
