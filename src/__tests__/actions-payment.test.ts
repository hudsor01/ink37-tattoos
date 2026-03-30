import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockGetSessionById = vi.fn();
const mockGetOrCreateStripeCustomer = vi.fn();
const mockCreatePaymentRecord = vi.fn();
const mockSendPaymentRequestEmail = vi.fn();
const mockValidateGiftCard = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockStripeCheckoutSessionsCreate = vi.fn();
const mockStripeCouponsCreate = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockStripeCheckoutSessionsCreate(...args),
      },
    },
    coupons: {
      create: (...args: unknown[]) => mockStripeCouponsCreate(...args),
    },
  },
  dollarsToStripeCents: (d: number) => Math.round(d * 100),
}));

vi.mock('@/lib/dal/payments', () => ({
  getOrCreateStripeCustomer: (...args: unknown[]) => mockGetOrCreateStripeCustomer(...args),
  createPaymentRecord: (...args: unknown[]) => mockCreatePaymentRecord(...args),
}));

vi.mock('@/lib/dal/sessions', () => ({
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
}));

vi.mock('@/lib/email/resend', () => ({
  sendPaymentRequestEmail: (...args: unknown[]) => mockSendPaymentRequestEmail(...args),
}));

vi.mock('@/lib/dal/gift-cards', () => ({
  validateGiftCard: (...args: unknown[]) => mockValidateGiftCard(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

vi.mock('@/lib/env', () => ({
  env: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}));

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };
const TEST_SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('Payment Actions - requestDepositAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { requestDepositAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    formData.set('amount', '100');
    await expect(requestDepositAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns validation error with invalid amount', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    const { requestDepositAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', 'not-a-uuid');
    formData.set('amount', '-10');
    const result = await requestDepositAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('creates deposit checkout session on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetSessionById.mockResolvedValue({
      id: TEST_SESSION_UUID,
      customerId: 'cust-1',
      designDescription: 'Dragon Sleeve',
      customer: {
        id: 'cust-1',
        email: 'customer@test.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_stripe_1');
    mockStripeCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test123',
      url: 'https://checkout.stripe.com/test',
    });
    mockCreatePaymentRecord.mockResolvedValue({ id: 'pay-1' });
    mockSendPaymentRequestEmail.mockResolvedValue(undefined);

    const { requestDepositAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    formData.set('amount', '100');
    const result = await requestDepositAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checkoutUrl).toBe('https://checkout.stripe.com/test');
    }
    expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledTimes(1);
    expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    expect(mockCreatePaymentRecord).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/payments');
  });
});

describe('Payment Actions - requestBalanceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { requestBalanceAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    await expect(requestBalanceAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns validation error with invalid sessionId', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    const { requestBalanceAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', 'not-a-uuid');
    const result = await requestBalanceAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('returns error when session fully paid', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetSessionById.mockResolvedValue({
      id: TEST_SESSION_UUID,
      totalCost: 500,
      paidAmount: 500,
      customerId: 'cust-1',
      customer: { id: 'cust-1', email: 'customer@test.com', firstName: 'John', lastName: 'Doe' },
    });
    const { requestBalanceAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    const result = await requestBalanceAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('creates balance checkout session on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetSessionById.mockResolvedValue({
      id: TEST_SESSION_UUID,
      totalCost: 500,
      paidAmount: 100,
      customerId: 'cust-1',
      designDescription: 'Dragon Sleeve',
      customer: { id: 'cust-1', email: 'customer@test.com', firstName: 'John', lastName: 'Doe' },
    });
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_stripe_1');
    mockStripeCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test456',
      url: 'https://checkout.stripe.com/balance',
    });
    mockCreatePaymentRecord.mockResolvedValue({ id: 'pay-2' });
    mockSendPaymentRequestEmail.mockResolvedValue(undefined);

    const { requestBalanceAction } = await import('@/lib/actions/payment-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    const result = await requestBalanceAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checkoutUrl).toBe('https://checkout.stripe.com/balance');
    }
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/payments');
  });
});
