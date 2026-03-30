import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockCustomerFindFirst = vi.fn();
const mockBillingPortalCreate = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/env', () => ({
  env: () => ({
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-chars-long',
    BETTER_AUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
  }),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockBillingPortalCreate(...args),
      },
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      customer: {
        findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
      },
    },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  customer: { userId: 'userId', id: 'id', stripeCustomerId: 'stripeCustomerId' },
}));

describe('Portal Billing API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session (unauthenticated)', async () => {
    mockGetCurrentSession.mockResolvedValue(null);

    const { POST } = await import('@/app/api/portal/billing/route');
    const response = await POST();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no user', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: null });

    const { POST } = await import('@/app/api/portal/billing/route');
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('returns 404 when no customer record linked to user', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockCustomerFindFirst.mockResolvedValue(null);

    const { POST } = await import('@/app/api/portal/billing/route');
    const response = await POST();
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('No customer record linked to your account');
  });

  it('returns 404 when customer has no stripeCustomerId', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1', stripeCustomerId: null });

    const { POST } = await import('@/app/api/portal/billing/route');
    const response = await POST();
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('No Stripe customer found. Payment history is not available yet.');
  });

  it('returns 200 with portal URL on success', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1', stripeCustomerId: 'cus_abc123' });
    mockBillingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/xxx' });

    const { POST } = await import('@/app/api/portal/billing/route');
    const response = await POST();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe('https://billing.stripe.com/session/xxx');
  });

  it('calls Stripe billingPortal.sessions.create with correct customer ID', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1', stripeCustomerId: 'cus_xyz' });
    mockBillingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/yyy' });

    const { POST } = await import('@/app/api/portal/billing/route');
    await POST();

    expect(mockBillingPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_xyz',
      })
    );
  });
});
