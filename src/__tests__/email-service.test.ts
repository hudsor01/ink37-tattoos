import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks (replaces vi.hoisted)
const mockSend = vi.fn();
const mockBatchSend = vi.fn();
const mockEnv = vi.fn((): Record<string, string | undefined> => ({
  RESEND_API_KEY: 'test-key',
  ADMIN_EMAIL: 'admin@test.com',
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/env', () => ({
  env: () => mockEnv(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockSend(...args) },
    batch: { send: (...args: unknown[]) => mockBatchSend(...args) },
  })),
}));

vi.mock('@/lib/email/templates', () => ({
  contactAdminTemplate: vi.fn(() => '<admin>'),
  contactConfirmationTemplate: vi.fn(() => '<confirm>'),
  paymentRequestTemplate: vi.fn(() => '<payment>'),
  orderConfirmationTemplate: vi.fn(() => '<order>'),
  giftCardDeliveryTemplate: vi.fn(() => '<giftcard>'),
  giftCardPurchaseConfirmationTemplate: vi.fn(() => '<gc-confirm>'),
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.mockReturnValue({
      RESEND_API_KEY: 'test-key',
      ADMIN_EMAIL: 'admin@test.com',
    });
  });

  describe('sendContactNotification', () => {
    const contactData = {
      name: 'John Doe',
      email: 'john@test.com',
      message: 'I want a tattoo',
    };

    it('returns {adminSent:false, customerSent:false} when ADMIN_EMAIL missing', async () => {
      mockEnv.mockReturnValue({ RESEND_API_KEY: 'test-key', ADMIN_EMAIL: undefined });
      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification(contactData);
      expect(result).toEqual({ adminSent: false, customerSent: false });
      expect(mockBatchSend).not.toHaveBeenCalled();
    });

    it('returns {adminSent:false, customerSent:false} when RESEND_API_KEY missing', async () => {
      mockEnv.mockReturnValue({ RESEND_API_KEY: undefined, ADMIN_EMAIL: 'admin@test.com' });
      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification(contactData);
      expect(result).toEqual({ adminSent: false, customerSent: false });
    });

    it('calls batch.send with admin and customer emails on success', async () => {
      mockBatchSend.mockResolvedValue({
        data: { data: [{ id: 'msg-1' }, { id: 'msg-2' }] },
        error: null,
      });
      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification(contactData);
      expect(mockBatchSend).toHaveBeenCalledTimes(1);
      const args = mockBatchSend.mock.calls[0][0];
      expect(args).toHaveLength(2);
      expect(args[0].to).toBe('admin@test.com');
      expect(args[1].to).toBe('john@test.com');
      expect(result.adminSent).toBe(true);
      expect(result.customerSent).toBe(true);
    });

    it('returns {adminSent:false, customerSent:false} when batch.send errors', async () => {
      mockBatchSend.mockResolvedValue({
        data: null,
        error: { message: 'API error' },
      });
      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification(contactData);
      expect(result).toEqual({ adminSent: false, customerSent: false });
    });

    it('handles batch.send returning { data: null, error: null } (no IDs)', async () => {
      mockBatchSend.mockResolvedValue({ data: null, error: null });
      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification(contactData);
      expect(result).toEqual({ adminSent: false, customerSent: false });
    });
  });

  describe('sendPaymentRequestEmail', () => {
    const paymentData = {
      to: 'client@test.com',
      customerName: 'Jane',
      amount: 150,
      type: 'deposit' as const,
      paymentUrl: 'https://pay.example.com/123',
    };

    it('returns {sent:false} when RESEND_API_KEY missing', async () => {
      mockEnv.mockReturnValue({ RESEND_API_KEY: undefined });
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      const result = await sendPaymentRequestEmail(paymentData);
      expect(result).toEqual({ sent: false });
    });

    it('calls emails.send with deposit subject for deposit type', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      await sendPaymentRequestEmail(paymentData);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const args = mockSend.mock.calls[0][0];
      expect(args.subject).toContain('Deposit');
    });

    it('calls emails.send with balance subject for balance type', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      await sendPaymentRequestEmail({ ...paymentData, type: 'balance' });
      const args = mockSend.mock.calls[0][0];
      expect(args.subject).toContain('Session Balance');
    });

    it('includes X-Entity-Ref-ID header', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      await sendPaymentRequestEmail(paymentData);
      const args = mockSend.mock.calls[0][0];
      expect(args.headers['X-Entity-Ref-ID']).toMatch(/^payment-deposit-/);
    });
  });

  describe('sendOrderConfirmationEmail', () => {
    const orderData = {
      to: 'buyer@test.com',
      orderId: 'ord-abc123',
      items: [{ name: 'Print', quantity: 1, price: 25 }],
      subtotal: 25,
      shipping: 7.99,
      discount: 0,
      total: 32.99,
      hasDigitalItems: false,
    };

    it('returns {sent:false} when RESEND_API_KEY missing', async () => {
      mockEnv.mockReturnValue({ RESEND_API_KEY: undefined });
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend');
      const result = await sendOrderConfirmationEmail(orderData);
      expect(result).toEqual({ sent: false });
    });

    it('includes order ID in X-Entity-Ref-ID header', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend');
      await sendOrderConfirmationEmail(orderData);
      const args = mockSend.mock.calls[0][0];
      expect(args.headers['X-Entity-Ref-ID']).toBe('order-ord-abc123');
    });
  });

  describe('sendGiftCardEmail', () => {
    const giftCardData = {
      to: 'recipient@test.com',
      recipientName: 'Alice',
      senderName: 'Bob',
      amount: 50,
      code: 'INK37-ABCD-EFGH-IJKL',
    };

    it('returns {sent:false} when RESEND_API_KEY missing', async () => {
      mockEnv.mockReturnValue({ RESEND_API_KEY: undefined });
      const { sendGiftCardEmail } = await import('@/lib/email/resend');
      const result = await sendGiftCardEmail(giftCardData);
      expect(result).toEqual({ sent: false });
    });

    it('sends gift card delivery email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
      const { sendGiftCardEmail } = await import('@/lib/email/resend');
      const result = await sendGiftCardEmail(giftCardData);
      expect(result).toEqual({ sent: true });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].to).toBe('recipient@test.com');
    });
  });

  describe('sendGiftCardPurchaseConfirmationEmail', () => {
    const confirmData = {
      to: 'buyer@test.com',
      amount: 50,
      recipientName: 'Alice',
    };

    it('returns {sent:false} when RESEND_API_KEY missing', async () => {
      mockEnv.mockReturnValue({ RESEND_API_KEY: undefined });
      const { sendGiftCardPurchaseConfirmationEmail } = await import('@/lib/email/resend');
      const result = await sendGiftCardPurchaseConfirmationEmail(confirmData);
      expect(result).toEqual({ sent: false });
    });

    it('sends purchase confirmation email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
      const { sendGiftCardPurchaseConfirmationEmail } = await import('@/lib/email/resend');
      const result = await sendGiftCardPurchaseConfirmationEmail(confirmData);
      expect(result).toEqual({ sent: true });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].subject).toContain('Gift Card Purchase Confirmation');
    });
  });
});
