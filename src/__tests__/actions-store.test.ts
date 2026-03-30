import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockValidateGiftCard = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockStripeCheckoutSessionsCreate = vi.fn();
const mockStripeCouponsCreate = vi.fn();
const mockDbQueryProductFindMany = vi.fn();
const mockDbTransaction = vi.fn();

vi.mock('server-only', () => ({}));

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

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      product: {
        findMany: (...args: unknown[]) => mockDbQueryProductFindMany(...args),
      },
    },
    transaction: (...args: unknown[]) => mockDbTransaction(...args),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  product: { id: 'id', isActive: 'isActive' },
  order: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId' },
  orderItem: { id: 'id', orderId: 'orderId' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@/lib/dal/gift-cards', () => ({
  validateGiftCard: (...args: unknown[]) => mockValidateGiftCard(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('@/lib/store-helpers', () => ({
  SHIPPING_RATE_CENTS: 799,
  FREE_SHIPPING_THRESHOLD: 75,
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

const TEST_PRODUCT_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('Store Actions - storeCheckoutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error with empty cart', async () => {
    const { storeCheckoutAction } = await import('@/lib/actions/store-actions');
    const result = await storeCheckoutAction({ items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('returns validation error with invalid productId', async () => {
    const { storeCheckoutAction } = await import('@/lib/actions/store-actions');
    const result = await storeCheckoutAction({
      items: [{ productId: 'not-a-uuid', quantity: 1 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('creates checkout session on success', async () => {
    mockDbQueryProductFindMany.mockResolvedValue([
      {
        id: TEST_PRODUCT_UUID,
        name: 'Test Sticker',
        price: '10',
        productType: 'PHYSICAL',
        stripePriceId: 'price_test123',
        isActive: true,
      },
    ]);
    mockDbTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      };
      mockStripeCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      });
      return fn(tx);
    });

    const { storeCheckoutAction } = await import('@/lib/actions/store-actions');
    const result = await storeCheckoutAction({
      items: [{ productId: TEST_PRODUCT_UUID, quantity: 1 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checkoutUrl).toBe('https://checkout.stripe.com/test');
    }
  });
});
