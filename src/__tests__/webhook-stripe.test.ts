import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks (replaces vi.hoisted)
const mockConstructEvent = vi.fn();
const mockFindFirst = vi.fn();
const mockInsertValues = vi.fn().mockReturnThis();
const mockInsertReturning = vi.fn();
const mockInsert = vi.fn((_table?: unknown) => ({
  values: (...args: unknown[]) => {
    mockInsertValues(...args);
    return { returning: (...rArgs: unknown[]) => mockInsertReturning(...rArgs) };
  },
}));

// Mock server-only (no-op in test environment)
vi.mock('server-only', () => ({}));

// Mock env module to avoid requiring real env vars in tests
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

// Mock auth module to avoid DB connection in tests
vi.mock('@/lib/auth', () => ({
  auth: {},
  getCurrentSession: vi.fn().mockResolvedValue(null),
}));

// Mock email module to avoid Resend client initialization
vi.mock('@/lib/email/resend', () => ({
  sendContactNotification: vi.fn(),
  sendPaymentRequestEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
  sendGiftCardEmail: vi.fn(),
  sendGiftCardPurchaseConfirmationEmail: vi.fn(),
}));

// Mock DAL modules imported by stripe route
vi.mock('@/lib/dal/orders', () => ({
  getOrderByCheckoutSessionId: vi.fn(),
}));

vi.mock('@/lib/dal/gift-cards', () => ({
  createGiftCard: vi.fn(),
  redeemGiftCard: vi.fn(),
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(),
}));

// Mock next/server
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

// Mock the stripe module
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

// Mock the db module with Drizzle API shape
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      stripeEvent: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
      payment: {
        findFirst: vi.fn(),
      },
    },
    insert: (table: unknown) => mockInsert(table),
    update: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
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

// Mock the schema module (needed for Drizzle where clause references)
vi.mock('@/lib/db/schema', () => ({
  stripeEvent: { stripeEventId: 'stripeEventId', id: 'id', type: 'type', processedAt: 'processedAt' },
  payment: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId', stripePaymentIntentId: 'stripePaymentIntentId', status: 'status', tattooSessionId: 'tattooSessionId', completedAt: 'completedAt', receiptUrl: 'receiptUrl' },
  tattooSession: { id: 'id', paidAmount: 'paidAmount' },
  order: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId', status: 'status' },
}));

describe('Stripe Webhook Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests with missing stripe-signature header', async () => {
    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
      headers: {},
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing stripe-signature header');
  });

  it('rejects requests with invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'invalid_sig' },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('skips already processed events (idempotency)', async () => {
    const mockEvent = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    };

    mockConstructEvent.mockReturnValue(mockEvent as never);
    mockFindFirst.mockResolvedValue({
      id: '1',
      stripeEventId: 'evt_123',
      type: 'checkout.session.completed',
      processedAt: new Date(),
    });

    const { POST } = await import('@/app/api/webhooks/stripe/route');

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: { 'stripe-signature': 'valid_sig' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    // Should not insert a new event record since it was already processed
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
