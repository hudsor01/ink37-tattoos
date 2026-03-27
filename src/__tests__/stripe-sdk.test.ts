import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const { mockSetupIntentsCreate, mockPaymentMethodsList } = vi.hoisted(() => ({
  mockSetupIntentsCreate: vi.fn(),
  mockPaymentMethodsList: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    setupIntents: { create: mockSetupIntentsCreate },
    paymentMethods: { list: mockPaymentMethodsList },
  })),
}));

describe('Stripe SDK Wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createSetupIntent', () => {
    it('calls stripe.setupIntents.create with customer and payment_method_types', async () => {
      const mockIntent = { id: 'seti_123', client_secret: 'secret_123' };
      mockSetupIntentsCreate.mockResolvedValue(mockIntent);

      const { createSetupIntent } = await import('@/lib/stripe');
      const result = await createSetupIntent('cus_abc');

      expect(mockSetupIntentsCreate).toHaveBeenCalledWith({
        customer: 'cus_abc',
        payment_method_types: ['card'],
      });
      expect(result).toEqual(mockIntent);
    });

    it('returns the SetupIntent from Stripe', async () => {
      const mockIntent = { id: 'seti_456', client_secret: 'secret_456', status: 'requires_payment_method' };
      mockSetupIntentsCreate.mockResolvedValue(mockIntent);

      const { createSetupIntent } = await import('@/lib/stripe');
      const result = await createSetupIntent('cus_def');
      expect(result.id).toBe('seti_456');
      expect(result.status).toBe('requires_payment_method');
    });
  });

  describe('listPaymentMethods', () => {
    it('maps response to {id, brand, last4, expMonth, expYear}', async () => {
      mockPaymentMethodsList.mockResolvedValue({
        data: [{
          id: 'pm_1',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2027 },
        }],
      });

      const { listPaymentMethods } = await import('@/lib/stripe');
      const result = await listPaymentMethods('cus_abc');

      expect(mockPaymentMethodsList).toHaveBeenCalledWith({
        customer: 'cus_abc',
        type: 'card',
      });
      expect(result).toEqual([{
        id: 'pm_1',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2027,
      }]);
    });

    it('defaults brand to unknown and last4 to **** when card data missing', async () => {
      mockPaymentMethodsList.mockResolvedValue({
        data: [{
          id: 'pm_2',
          card: null,
        }],
      });

      const { listPaymentMethods } = await import('@/lib/stripe');
      const result = await listPaymentMethods('cus_abc');

      expect(result[0].brand).toBe('unknown');
      expect(result[0].last4).toBe('****');
    });
  });
});
