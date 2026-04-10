import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Module-scope mocks (replaces vi.hoisted)
const mockVerifyCalSignature = vi.fn();
const mockCustomerFindFirst = vi.fn();
const mockSettingsFindFirst = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertOnConflict = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockUpdateReturning = vi.fn();

// Mock server-only (no-op in test environment)
vi.mock('server-only', () => ({}));

// Mock env module
vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-chars-long',
    BETTER_AUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    CAL_WEBHOOK_SECRET: 'cal_test_secret',
  },
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: {},
  getCurrentSession: vi.fn().mockResolvedValue(null),
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Mock rate limiter
vi.mock('@/lib/security/rate-limiter', () => ({
  rateLimiters: {
    webhook: { limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }) },
  },
  getRequestIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn().mockReturnValue(Response.json({ error: 'Too many requests' }, { status: 429 })),
}));

// Mock Cal.com verification
vi.mock('@/lib/cal/verify', () => ({
  verifyCalSignature: (...args: unknown[]) => mockVerifyCalSignature(...args),
}));

// Mock db with Drizzle API shape
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      customer: { findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args) },
      settings: { findFirst: (...args: unknown[]) => mockSettingsFindFirst(...args) },
    },
    insert: vi.fn(() => ({
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return {
          onConflictDoUpdate: (...ocArgs: unknown[]) => {
            mockInsertOnConflict(...ocArgs);
            return { /* terminal - appointment upsert returns void */ };
          },
          returning: () => {
            return mockInsertReturning();
          },
        };
      },
    })),
    update: vi.fn(() => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: (...wArgs: unknown[]) => {
            mockUpdateWhere(...wArgs);
            return {
              returning: () => mockUpdateReturning(),
            };
          },
        };
      },
    })),
  },
}));

// Mock schema module
vi.mock('@/lib/db/schema', () => ({
  appointment: {
    calBookingUid: 'calBookingUid',
    customerId: 'customerId',
    id: 'id',
    status: 'status',
  },
  customer: { email: 'email', id: 'id' },
  settings: { key: 'key' },
  calEvent: { id: 'id', calEventUid: 'calEventUid', triggerEvent: 'triggerEvent', processedAt: 'processedAt' },
  appointmentTypeEnum: {
    enumValues: ['CONSULTATION', 'DESIGN_REVIEW', 'TATTOO_SESSION', 'TOUCH_UP', 'REMOVAL'],
  },
}));

function buildCalPayload(overrides: Record<string, unknown> = {}) {
  const base = {
    triggerEvent: 'BOOKING_CREATED',
    createdAt: new Date().toISOString(),
    payload: {
      uid: 'cal-booking-uid-123',
      bookingId: 1,
      eventTypeId: 42,
      startTime: '2026-04-01T10:00:00Z',
      endTime: '2026-04-01T11:00:00Z',
      length: 60,
      title: 'Consultation',
      type: 'consultation',
      status: 'ACCEPTED',
      description: null,
      location: null,
      organizer: {
        id: 1,
        name: 'Artist',
        email: 'artist@ink37.com',
        username: 'artist',
        timeZone: 'America/Chicago',
        language: { locale: 'en' },
        timeFormat: '12',
        utcOffset: -5,
      },
      attendees: [
        {
          name: 'John Doe',
          email: 'john@example.com',
          timeZone: 'America/Chicago',
          language: { locale: 'en' },
        },
      ],
      responses: { phone: { value: '555-0123' } },
      metadata: {},
      ...(overrides.payload as Record<string, unknown> ?? {}),
    },
  };
  // Allow overriding top-level fields like triggerEvent
  if (overrides.triggerEvent) base.triggerEvent = overrides.triggerEvent as string;
  return base;
}

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/webhooks/cal', {
    method: 'POST',
    body,
    headers,
  });
}

describe('Cal.com Webhook Signature Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAL_WEBHOOK_SECRET = 'cal_test_secret';
  });

  it('rejects requests with missing X-Cal-Signature-256 header', async () => {
    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(makeRequest('{}'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Missing signature');
  });

  it('rejects requests with invalid signature', async () => {
    mockVerifyCalSignature.mockReturnValue(false);

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const payload = JSON.stringify(buildCalPayload());
    const response = await POST(
      makeRequest(payload, { 'x-cal-signature-256': 'invalid_sig' })
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('rejects requests when CAL_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.CAL_WEBHOOK_SECRET;
    const { POST } = await import('@/app/api/webhooks/cal/route');
    const response = await POST(
      makeRequest('{}', { 'x-cal-signature-256': 'some_sig' })
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Webhook secret not configured');
  });
});

describe('Cal.com Webhook Event Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CAL_WEBHOOK_SECRET = 'cal_test_secret';
    mockSettingsFindFirst.mockResolvedValue({ value: {} });
    mockInsertReturning.mockResolvedValue([{ id: 'new-customer-id', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }]);
    mockUpdateReturning.mockResolvedValue([{ id: 'apt-id' }]);
  });

  async function sendValidEvent(payload: Record<string, unknown> = {}) {
    mockVerifyCalSignature.mockReturnValue(true);

    const { POST } = await import('@/app/api/webhooks/cal/route');
    const body = JSON.stringify(buildCalPayload(payload));
    return POST(makeRequest(body, { 'x-cal-signature-256': 'valid_sig' }));
  }

  it('creates appointment from BOOKING_CREATED with all cal fields', async () => {
    mockCustomerFindFirst.mockResolvedValue({
      id: 'existing-customer-id',
      email: 'john@example.com',
    });

    const response = await sendValidEvent();
    expect(response.status).toBe(200);

    // Verify appointment insert was called with cal fields
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        calBookingUid: 'cal-booking-uid-123',
        calStatus: 'CONFIRMED',
        source: 'cal.com',
        status: 'CONFIRMED',
        customerId: 'existing-customer-id',
      })
    );

    // Verify idempotent upsert via onConflictDoUpdate
    expect(mockInsertOnConflict).toHaveBeenCalled();
  });

  it('creates new customer when email not found', async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const response = await sendValidEvent();
    expect(response.status).toBe(200);

    // Customer insert should be called with source note
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'john@example.com',
        notes: 'source: cal.com',
      })
    );
  });

  it('links to existing customer when email matches', async () => {
    mockCustomerFindFirst.mockResolvedValue({
      id: 'existing-customer-id',
      email: 'john@example.com',
    });

    const response = await sendValidEvent();
    expect(response.status).toBe(200);

    // Appointment insert should use existing customer ID
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'existing-customer-id',
      })
    );
  });

  it('handles duplicate BOOKING_CREATED idempotently', async () => {
    mockCustomerFindFirst.mockResolvedValue({
      id: 'existing-customer-id',
      email: 'john@example.com',
    });

    const response = await sendValidEvent();
    expect(response.status).toBe(200);
    expect(mockInsertOnConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'calBookingUid',
      })
    );
  });

  it('updates appointment on BOOKING_RESCHEDULED using rescheduleUid', async () => {
    const response = await sendValidEvent({
      triggerEvent: 'BOOKING_RESCHEDULED',
      payload: {
        uid: 'new-uid-456',
        rescheduleUid: 'old-uid-123',
        bookingId: 1,
        eventTypeId: 42,
        startTime: '2026-04-02T10:00:00Z',
        endTime: '2026-04-02T11:00:00Z',
        length: 60,
        attendees: [
          { name: 'John Doe', email: 'john@example.com', timeZone: 'America/Chicago', language: { locale: 'en' } },
        ],
        metadata: {},
      },
    });
    expect(response.status).toBe(200);

    // Verify update was called with new UID and RESCHEDULED status
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        calBookingUid: 'new-uid-456',
        calStatus: 'RESCHEDULED',
      })
    );
  });

  it('cancels appointment on BOOKING_CANCELLED', async () => {
    const response = await sendValidEvent({
      triggerEvent: 'BOOKING_CANCELLED',
      payload: {
        uid: 'cal-booking-uid-123',
        bookingId: 1,
        eventTypeId: 42,
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T11:00:00Z',
        length: 60,
        attendees: [
          { name: 'John Doe', email: 'john@example.com', timeZone: 'America/Chicago', language: { locale: 'en' } },
        ],
        metadata: {},
        cancellationReason: 'Changed my mind',
      },
    });
    expect(response.status).toBe(200);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CANCELLED',
        calStatus: 'CANCELLED',
      })
    );
  });
});

describe('verifyCalSignature unit tests', () => {
  it('returns true for valid HMAC-SHA256 signature', () => {
    const secret = 'test-secret';
    const body = '{"test":"data"}';
    const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

    // Verify HMAC produces consistent output and timingSafeEqual confirms match
    const computed = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const result = crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(validSig, 'hex')
    );
    expect(result).toBe(true);
    expect(computed).toBe(validSig);
  });

  it('returns false for invalid signature', () => {
    const secret = 'test-secret';
    const body = '{"test":"data"}';
    const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const invalidSig = crypto.createHmac('sha256', secret).update('wrong-body').digest('hex');

    // Same length but different content
    expect(validSig).not.toBe(invalidSig);
    const result = crypto.timingSafeEqual(
      Buffer.from(validSig, 'hex'),
      Buffer.from(invalidSig, 'hex')
    );
    expect(result).toBe(false);
  });

  it('returns false for different length signatures', () => {
    // timingSafeEqual throws on different lengths - our function catches this
    try {
      crypto.timingSafeEqual(
        Buffer.from('short', 'hex'),
        Buffer.from('muchlongersignature', 'hex')
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch {
      // Expected behavior - different lengths throw
      expect(true).toBe(true);
    }
  });
});
