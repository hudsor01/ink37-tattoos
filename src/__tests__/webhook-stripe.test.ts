import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only (no-op in test environment)
vi.mock('server-only', () => ({}));

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
      constructEvent: vi.fn(),
    },
    paymentIntents: { retrieve: vi.fn() },
    charges: { retrieve: vi.fn() },
  },
  stripeCentsToDollars: (cents: number) => cents / 100,
}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    stripeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    payment: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tattooSession: {
      update: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}));

import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

describe('Stripe Webhook Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module registry so each test gets fresh POST import
    vi.resetModules();
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
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
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

    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as never);
    vi.mocked(db.stripeEvent.findUnique).mockResolvedValue({
      id: '1',
      stripeEventId: 'evt_123',
      type: 'checkout.session.completed',
      processedAt: new Date(),
    } as never);

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
    // Should not create a new event record since it was already processed
    expect(db.stripeEvent.create).not.toHaveBeenCalled();
  });
});
