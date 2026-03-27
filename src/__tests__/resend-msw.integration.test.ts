import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({
  env: () => ({
    RESEND_API_KEY: 're_msw_integration_test_key',
    ADMIN_EMAIL: 'admin@ink37test.com',
  }),
}));

let msgCounter = 0;
const capturedRequests: Array<{ url: string; body: unknown }> = [];

const server = setupServer(
  http.post('https://api.resend.com/emails', async ({ request }) => {
    const body = await request.json();
    capturedRequests.push({ url: request.url, body });
    return HttpResponse.json({ id: `msg_${++msgCounter}` });
  }),

  http.post('https://api.resend.com/emails/batch', async ({ request }) => {
    const body = (await request.json()) as unknown[];
    capturedRequests.push({ url: request.url, body });
    return HttpResponse.json({
      data: body.map((_: unknown, i: number) => ({ id: `batch_${++msgCounter}_${i}` })),
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

afterEach(() => {
  server.resetHandlers();
  vi.resetModules();
  capturedRequests.length = 0;
  msgCounter = 0;
});

afterAll(() => server.close());

describe('Resend Email via MSW (network-level)', () => {
  describe('sendContactNotification', () => {
    it('sends batch request with admin + customer emails', async () => {
      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification({
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'I want to book a sleeve tattoo',
      });

      expect(result.adminSent).toBe(true);
      expect(result.customerSent).toBe(true);
      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].url).toContain('/emails/batch');

      const emails = capturedRequests[0].body as Array<Record<string, unknown>>;
      expect(emails).toHaveLength(2);
      expect(emails[0].to).toBe('admin@ink37test.com');
      expect(emails[1].to).toBe('jane@example.com');
    });

    it('includes reply_to on admin email for direct replies', async () => {
      const { sendContactNotification } = await import('@/lib/email/resend');
      await sendContactNotification({
        name: 'Bob',
        email: 'bob@example.com',
        message: 'Pricing question',
      });

      const emails = capturedRequests[0].body as Array<Record<string, unknown>>;
      expect(emails[0].reply_to).toBe('bob@example.com');
    });

    it('returns both false when API errors', async () => {
      server.use(
        http.post('https://api.resend.com/emails/batch', () => {
          return HttpResponse.json(
            { statusCode: 403, message: 'Invalid API key', name: 'validation_error' },
            { status: 403 },
          );
        }),
      );

      const { sendContactNotification } = await import('@/lib/email/resend');
      const result = await sendContactNotification({
        name: 'Err',
        email: 'err@example.com',
        message: 'test',
      });

      expect(result.adminSent).toBe(false);
      expect(result.customerSent).toBe(false);
    });
  });

  describe('sendPaymentRequestEmail', () => {
    it('sends deposit email via single send endpoint', async () => {
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      const result = await sendPaymentRequestEmail({
        to: 'client@example.com',
        customerName: 'Alice',
        amount: 200,
        type: 'deposit',
        paymentUrl: 'https://pay.ink37.com/abc',
      });

      expect(result.sent).toBe(true);
      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].url).toContain('/emails');
      expect(capturedRequests[0].url).not.toContain('/batch');

      const body = capturedRequests[0].body as Record<string, unknown>;
      expect(body.to).toBe('client@example.com');
      expect(body.subject).toContain('Deposit');
    });

    it('sends balance email with correct subject', async () => {
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      await sendPaymentRequestEmail({
        to: 'client@example.com',
        customerName: 'Alice',
        amount: 350,
        type: 'balance',
        paymentUrl: 'https://pay.ink37.com/xyz',
      });

      const body = capturedRequests[0].body as Record<string, unknown>;
      expect(body.subject).toContain('Session Balance');
    });

    it('includes X-Entity-Ref-ID header in request body', async () => {
      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      await sendPaymentRequestEmail({
        to: 'client@example.com',
        customerName: 'Alice',
        amount: 200,
        type: 'deposit',
        paymentUrl: 'https://pay.ink37.com/abc',
      });

      const body = capturedRequests[0].body as Record<string, unknown>;
      const headers = body.headers as Record<string, string>;
      expect(headers['X-Entity-Ref-ID']).toMatch(/^payment-deposit-/);
    });
  });

  describe('sendGiftCardEmail', () => {
    it('sends gift card delivery email', async () => {
      const { sendGiftCardEmail } = await import('@/lib/email/resend');
      const result = await sendGiftCardEmail({
        to: 'recipient@example.com',
        recipientName: 'Alice',
        senderName: 'Bob',
        amount: 75,
        code: 'INK37-ABCD-EFGH-IJKL',
      });

      expect(result.sent).toBe(true);
      const body = capturedRequests[0].body as Record<string, unknown>;
      expect(body.to).toBe('recipient@example.com');
      expect(body.subject).toBe("You've received an Ink 37 Gift Card!");
    });
  });

  describe('sendOrderConfirmationEmail', () => {
    it('sends order confirmation with correct subject', async () => {
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend');
      const result = await sendOrderConfirmationEmail({
        to: 'buyer@example.com',
        orderId: 'ord-msw-001',
        items: [{ name: 'Flash Print', quantity: 2, price: 25 }],
        subtotal: 50,
        shipping: 7.99,
        discount: 0,
        total: 57.99,
        hasDigitalItems: false,
      });

      expect(result.sent).toBe(true);
      const body = capturedRequests[0].body as Record<string, unknown>;
      expect(body.to).toBe('buyer@example.com');
      expect(body.subject).toBe('Order Confirmation - Ink 37 Tattoos');
    });

    it('includes order-specific X-Entity-Ref-ID', async () => {
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend');
      await sendOrderConfirmationEmail({
        to: 'buyer@example.com',
        orderId: 'ord-ref-test',
        items: [{ name: 'Sticker', quantity: 1, price: 5 }],
        subtotal: 5,
        shipping: 3,
        discount: 0,
        total: 8,
        hasDigitalItems: false,
      });

      const body = capturedRequests[0].body as Record<string, unknown>;
      const headers = body.headers as Record<string, string>;
      expect(headers['X-Entity-Ref-ID']).toBe('order-ord-ref-test');
    });
  });

  describe('sendGiftCardPurchaseConfirmationEmail', () => {
    it('sends purchase confirmation', async () => {
      const { sendGiftCardPurchaseConfirmationEmail } = await import('@/lib/email/resend');
      const result = await sendGiftCardPurchaseConfirmationEmail({
        to: 'buyer@example.com',
        amount: 100,
        recipientName: 'Charlie',
      });

      expect(result.sent).toBe(true);
      const body = capturedRequests[0].body as Record<string, unknown>;
      expect(body.subject).toContain('Gift Card Purchase Confirmation');
    });
  });

  describe('error handling', () => {
    it('single send API 500 throws', async () => {
      server.use(
        http.post('https://api.resend.com/emails', () => {
          return HttpResponse.json(
            { statusCode: 500, message: 'Internal error', name: 'internal_server_error' },
            { status: 500 },
          );
        }),
      );

      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      const result = await sendPaymentRequestEmail({
        to: 'err@example.com',
        customerName: 'Err',
        amount: 100,
        type: 'deposit',
        paymentUrl: 'https://pay.ink37.com/err',
      });
      // Resend SDK wraps errors — sent will be false
      expect(result.sent).toBe(false);
    });

    it('network failure returns sent false (SDK catches internally)', async () => {
      server.use(
        http.post('https://api.resend.com/emails', () => {
          return HttpResponse.error();
        }),
      );

      const { sendPaymentRequestEmail } = await import('@/lib/email/resend');
      const result = await sendPaymentRequestEmail({
        to: 'net@example.com',
        customerName: 'Net',
        amount: 100,
        type: 'deposit',
        paymentUrl: 'https://pay.ink37.com/net',
      });
      expect(result.sent).toBe(false);
    });
  });
});
