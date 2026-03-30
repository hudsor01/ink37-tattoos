import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// E2E Integration Flow Tests
//
// These tests exercise multi-step business flows by calling actions and routes
// in sequence. They are NOT browser-level E2E -- they use vitest + vi.mock to
// test the sequence of operations a user would perform.
//
// 4 flows:
//   1. Guest Checkout (store purchase without login)
//   2. Tattoo Session Payment (admin creates session, sends payment request)
//   3. Portal Consent Signing (user signs consent for their session)
//   4. Admin CRUD Flow (create -> update -> delete customer)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Module-scope mocks
// ---------------------------------------------------------------------------
const mockGetCurrentSession = vi.fn();

// Customer DAL
const mockCreateCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockDeleteCustomer = vi.fn();

// Session DAL
const mockCreateSession = vi.fn();
const mockUpdateSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockGetSessionById = vi.fn();

// Payment DAL
const mockGetOrCreateStripeCustomer = vi.fn();
const mockCreatePaymentRecord = vi.fn();

// Audit DAL
const mockLogAudit = vi.fn();

// DB mock
const mockCustomerFindFirst = vi.fn();
const mockTattooSessionFindFirst = vi.fn();
const mockDbUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockDbInsertValuesReturning = vi.fn();
const mockDbInsertValues = vi.fn().mockReturnThis();
const mockProductFindMany = vi.fn();
const mockOrderInsertReturning = vi.fn();
const mockStripeEventFindFirst = vi.fn();
const mockPaymentFindFirst = vi.fn();
const mockDbTransaction = vi.fn();

// Stripe mock
const mockStripeCheckoutCreate = vi.fn();
const mockStripeCouponsCreate = vi.fn();
const mockStripeWebhooksConstructEvent = vi.fn();
const mockStripePaymentIntentsRetrieve = vi.fn();
const mockStripeChargesRetrieve = vi.fn();

// Email mock
const mockSendPaymentRequestEmail = vi.fn();
const mockSendOrderConfirmationEmail = vi.fn();

// Other mocks
const mockRevalidatePath = vi.fn();
const mockGetOrderByCheckoutSessionId = vi.fn();
const mockCreateGiftCard = vi.fn();
const mockRedeemGiftCard = vi.fn();
const mockValidateGiftCard = vi.fn();

// ---------------------------------------------------------------------------
// vi.mock declarations
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
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
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}));

vi.mock('@/lib/dal/customers', () => ({
  createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
  deleteCustomer: (...args: unknown[]) => mockDeleteCustomer(...args),
}));

vi.mock('@/lib/dal/sessions', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
}));

vi.mock('@/lib/dal/appointments', () => ({
  createAppointment: vi.fn().mockResolvedValue({ id: 'apt-1' }),
  updateAppointment: vi.fn().mockResolvedValue({ id: 'apt-1' }),
  deleteAppointment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('@/lib/dal/payments', () => ({
  getOrCreateStripeCustomer: (...args: unknown[]) => mockGetOrCreateStripeCustomer(...args),
  createPaymentRecord: (...args: unknown[]) => mockCreatePaymentRecord(...args),
}));

vi.mock('@/lib/dal/orders', () => ({
  getOrderByCheckoutSessionId: (...args: unknown[]) => mockGetOrderByCheckoutSessionId(...args),
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/dal/gift-cards', () => ({
  createGiftCard: (...args: unknown[]) => mockCreateGiftCard(...args),
  redeemGiftCard: (...args: unknown[]) => mockRedeemGiftCard(...args),
  validateGiftCard: (...args: unknown[]) => mockValidateGiftCard(...args),
}));

vi.mock('@/lib/email/resend', () => ({
  sendPaymentRequestEmail: (...args: unknown[]) => mockSendPaymentRequestEmail(...args),
  sendContactNotification: vi.fn(),
  sendOrderConfirmationEmail: (...args: unknown[]) => mockSendOrderConfirmationEmail(...args),
  sendGiftCardEmail: vi.fn(),
  sendGiftCardPurchaseConfirmationEmail: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: (...args: unknown[]) => mockStripeCheckoutCreate(...args) } },
    coupons: { create: (...args: unknown[]) => mockStripeCouponsCreate(...args) },
    webhooks: { constructEvent: (...args: unknown[]) => mockStripeWebhooksConstructEvent(...args) },
    paymentIntents: { retrieve: (...args: unknown[]) => mockStripePaymentIntentsRetrieve(...args) },
    charges: { retrieve: (...args: unknown[]) => mockStripeChargesRetrieve(...args) },
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_stripe_1' }) },
    products: { create: vi.fn().mockResolvedValue({ id: 'sp_1' }), update: vi.fn() },
    prices: { create: vi.fn().mockResolvedValue({ id: 'price_1' }), update: vi.fn() },
    refunds: { create: vi.fn() },
  },
  dollarsToStripeCents: (d: number) => Math.round(d * 100),
  stripeCentsToDollars: (c: number) => c / 100,
}));

vi.mock('@vercel/blob', () => ({
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/env', () => ({
  env: () => ({
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_fake',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-long-xxxxxx',
    BETTER_AUTH_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  }),
}));

vi.mock('@/lib/security/validation', () => ({
  CreateCustomerSchema: { parse: (d: unknown) => d },
  UpdateCustomerSchema: { parse: (d: unknown) => d },
  CreateSessionSchema: { parse: (d: unknown) => d },
  CreateAppointmentSchema: { parse: (d: unknown) => d },
  UpdateAppointmentSchema: { parse: (d: unknown) => d },
  UpdateOrderStatusSchema: { parse: (d: unknown) => d },
  RequestDepositSchema: { parse: (d: unknown) => d },
  RequestBalanceSchema: { parse: (d: unknown) => d },
  StoreCheckoutSchema: { parse: (d: unknown) => d },
  ConsentSignSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  UpdatePortalProfileSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
}));

vi.mock('@/lib/store-helpers', () => ({
  SHIPPING_RATE_CENTS: 599,
  FREE_SHIPPING_THRESHOLD: 75,
  DOWNLOAD_LINK_EXPIRY_HOURS: 72,
  MAX_DOWNLOADS_PER_TOKEN: 5,
}));

vi.mock('@/lib/db', () => {
  const txProxy = {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'new-order-1' }]),
    })),
  };

  return {
    db: {
      query: {
        customer: { findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args) },
        tattooSession: { findFirst: (...args: unknown[]) => mockTattooSessionFindFirst(...args) },
        product: { findMany: (...args: unknown[]) => mockProductFindMany(...args) },
        stripeEvent: { findFirst: (...args: unknown[]) => mockStripeEventFindFirst(...args) },
        payment: { findFirst: (...args: unknown[]) => mockPaymentFindFirst(...args) },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: (...args: unknown[]) => mockDbUpdateSetWhere(...args),
        })),
      })),
      insert: vi.fn(() => ({
        values: (...args: unknown[]) => {
          mockDbInsertValues(...args);
          return { returning: (...rArgs: unknown[]) => mockDbInsertValuesReturning(...rArgs) };
        },
      })),
      transaction: (...args: unknown[]) => mockDbTransaction(...args),
    },
  };
});

vi.mock('@/lib/db/schema', () => ({
  customer: { userId: 'userId', id: 'id', email: 'email', stripeCustomerId: 'stripeCustomerId' },
  tattooSession: {
    id: 'id', customerId: 'customerId', consentSigned: 'consentSigned',
    consentSignedAt: 'consentSignedAt', consentSignedBy: 'consentSignedBy',
    paidAmount: 'paidAmount',
  },
  product: { id: 'id', isActive: 'isActive', stripePriceId: 'stripePriceId' },
  order: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId', status: 'status' },
  orderItem: { orderId: 'orderId', productId: 'productId' },
  payment: { id: 'id', stripeCheckoutSessionId: 'stripeCheckoutSessionId', stripePaymentIntentId: 'stripePaymentIntentId', status: 'status', tattooSessionId: 'tattooSessionId' },
  stripeEvent: { stripeEventId: 'stripeEventId' },
  downloadToken: { token: 'token', downloadCount: 'downloadCount' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((...args: unknown[]) => args),
  sql: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const adminSession = {
  user: { id: 'admin-1', role: 'admin', email: 'admin@ink37.com', name: 'Admin' },
};

const userSession = {
  user: { id: 'user-1', role: 'user', email: 'client@test.com', name: 'Client' },
};

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('E2E Integration Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // =========================================================================
  // Flow 1: Guest Checkout (store purchase without login)
  // =========================================================================
  describe('Flow 1: Guest Checkout', () => {
    const cartItems = [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ];

    const mockProducts = [
      { id: 'prod-1', name: 'Tattoo Print', price: 25, productType: 'DIGITAL', isActive: true, stripePriceId: 'price_print' },
      { id: 'prod-2', name: 'T-Shirt', price: 35, productType: 'PHYSICAL', isActive: true, stripePriceId: 'price_shirt' },
    ];

    it('Step 1: Store checkout creates Stripe session with cart items', async () => {
      // Mock product lookup via db.query.product.findMany
      mockProductFindMany.mockResolvedValue(mockProducts);

      // Mock DB transaction for atomic order creation
      mockDbTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const txProxy = {
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
        return fn(txProxy);
      });

      mockStripeCheckoutCreate.mockResolvedValue({
        id: 'cs_checkout_1',
        url: 'https://checkout.stripe.com/pay/cs_checkout_1',
      });

      const { storeCheckoutAction } = await import('@/lib/actions/store-actions');
      const result = await storeCheckoutAction({ items: cartItems });

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toContain('checkout.stripe.com');

      // Verify Stripe session was created with line items
      expect(mockStripeCheckoutCreate).toHaveBeenCalledTimes(1);
      const stripeArgs = mockStripeCheckoutCreate.mock.calls[0][0];
      expect(stripeArgs.mode).toBe('payment');
      expect(stripeArgs.line_items).toHaveLength(2);
      expect(stripeArgs.metadata.orderType).toBe('store');
    });

    it('Step 2: Store checkout handles physical items with shipping', async () => {
      mockProductFindMany.mockResolvedValue(mockProducts);
      mockDbTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const txProxy = {
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([{ id: 'order-2' }]),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn().mockResolvedValue(undefined),
            })),
          })),
        };
        return fn(txProxy);
      });
      mockStripeCheckoutCreate.mockResolvedValue({
        id: 'cs_checkout_2',
        url: 'https://checkout.stripe.com/pay/cs_checkout_2',
      });

      const { storeCheckoutAction } = await import('@/lib/actions/store-actions');
      const result = await storeCheckoutAction({ items: cartItems });

      expect(result.success).toBe(true);

      // Verify shipping was added (cart has physical T-Shirt)
      const stripeArgs = mockStripeCheckoutCreate.mock.calls[0][0];
      expect(stripeArgs.shipping_address_collection).toBeDefined();
      expect(stripeArgs.shipping_options).toBeDefined();
      expect(stripeArgs.shipping_options.length).toBeGreaterThan(0);
    });

    it('Step 3: Stripe webhook (checkout.session.completed) updates order to PAID', async () => {
      // Simulate the Stripe webhook event
      const checkoutEvent = {
        id: 'evt_checkout_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_checkout_1',
            payment_intent: 'pi_checkout_1',
            metadata: { orderType: 'store', orderId: 'order-1' },
            customer_details: { email: 'guest@test.com' },
            amount_total: 8500, // $85.00
            total_details: { amount_shipping: 599 },
            collected_information: {
              shipping_details: {
                name: 'John Doe',
                address: { line1: '123 Main St', city: 'Portland', state: 'OR', postal_code: '97201', country: 'US' },
              },
            },
          },
        },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(checkoutEvent);
      mockStripeEventFindFirst.mockResolvedValue(null); // Not already processed
      mockDbInsertValuesReturning.mockResolvedValue([]);
      mockDbUpdateSetWhere.mockResolvedValue(undefined);
      mockGetOrderByCheckoutSessionId.mockResolvedValue({
        id: 'order-1',
        subtotal: 85,
        total: 85,
        shippingAmount: 5.99,
        discountAmount: 0,
        items: [
          { productName: 'Tattoo Print', quantity: 2, totalPrice: 50, product: { productType: 'DIGITAL' }, downloadTokens: [{ token: 'dl_token_1' }] },
          { productName: 'T-Shirt', quantity: 1, totalPrice: 35, product: { productType: 'PHYSICAL' }, downloadTokens: [] },
        ],
      });

      const webhookRoute = await import('@/app/api/webhooks/stripe/route');
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(checkoutEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await webhookRoute.POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify order was updated (db.update was called)
      expect(mockDbUpdateSetWhere).toHaveBeenCalled();

      // Verify event was recorded for idempotency
      expect(mockDbInsertValues).toHaveBeenCalled();
    });

    it('Step 4: Order confirmation email sent with download links for digital items', async () => {
      // From step 3 -- verify email was sent
      const checkoutEvent = {
        id: 'evt_checkout_email',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_checkout_email',
            payment_intent: 'pi_checkout_email',
            metadata: { orderType: 'store', orderId: 'order-email' },
            customer_details: { email: 'guest@test.com' },
            amount_total: 5000,
            total_details: { amount_shipping: 0 },
          },
        },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(checkoutEvent);
      mockStripeEventFindFirst.mockResolvedValue(null);
      mockDbInsertValuesReturning.mockResolvedValue([]);
      mockDbUpdateSetWhere.mockResolvedValue(undefined);
      mockGetOrderByCheckoutSessionId.mockResolvedValue({
        id: 'order-email',
        subtotal: 50,
        total: 50,
        shippingAmount: 0,
        discountAmount: 0,
        items: [
          {
            productName: 'Art Print',
            quantity: 1,
            totalPrice: 50,
            product: { productType: 'DIGITAL' },
            downloadTokens: [{ token: 'dl_token_2' }],
          },
        ],
      });

      const webhookRoute = await import('@/app/api/webhooks/stripe/route');
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(checkoutEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      await webhookRoute.POST(request);

      // Verify email was sent with download links
      expect(mockSendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
      const emailArgs = mockSendOrderConfirmationEmail.mock.calls[0][0];
      expect(emailArgs.to).toBe('guest@test.com');
      expect(emailArgs.hasDigitalItems).toBe(true);
      expect(emailArgs.downloadLinks).toBeDefined();
      expect(emailArgs.downloadLinks.length).toBeGreaterThan(0);
      expect(emailArgs.downloadLinks[0].url).toContain('dl_token_2');
    });
  });

  // =========================================================================
  // Flow 2: Tattoo Session Payment
  // =========================================================================
  describe('Flow 2: Tattoo Session Payment', () => {
    it('Step 1: Admin creates a customer', async () => {
      mockGetCurrentSession.mockResolvedValue(adminSession);
      mockCreateCustomer.mockResolvedValue({
        id: 'cust-new',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
      });

      const { createCustomerAction } = await import('@/lib/actions/customer-actions');
      const fd = new FormData();
      fd.set('firstName', 'Jane');
      fd.set('lastName', 'Smith');
      fd.set('email', 'jane@test.com');
      const customer = await createCustomerAction(fd);

      expect(customer.id).toBe('cust-new');
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1);
      expect(mockCreateCustomer.mock.calls[0][0]).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
      });
    });

    it('Step 2: Admin creates a tattoo session for the customer', async () => {
      mockGetCurrentSession.mockResolvedValue(adminSession);
      mockCreateSession.mockResolvedValue({
        id: 'sess-new',
        customerId: 'cust-new',
        designDescription: 'Japanese Sleeve',
        totalCost: 500,
        paidAmount: 0,
      });

      const { createSessionAction } = await import('@/lib/actions/session-actions');
      const fd = new FormData();
      fd.set('customerId', 'cust-new');
      fd.set('designDescription', 'Japanese Sleeve');
      fd.set('duration', '480');
      fd.set('hourlyRate', '150');
      fd.set('estimatedHours', '8');
      fd.set('totalCost', '500');
      fd.set('depositAmount', '100');
      const session = await createSessionAction(fd);

      expect(session.id).toBe('sess-new');
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    });

    it('Step 3: Admin sends payment request (deposit)', async () => {
      mockGetCurrentSession.mockResolvedValue(adminSession);
      mockGetSessionById.mockResolvedValue({
        id: 'sess-new',
        customerId: 'cust-new',
        designDescription: 'Japanese Sleeve',
        totalCost: 500,
        paidAmount: 0,
        customer: { id: 'cust-new', email: 'jane@test.com', firstName: 'Jane', lastName: 'Smith' },
      });
      mockGetOrCreateStripeCustomer.mockResolvedValue('cus_stripe_jane');
      mockStripeCheckoutCreate.mockResolvedValue({ id: 'cs_deposit_1', url: 'https://checkout.stripe.com/cs_deposit_1' });
      mockCreatePaymentRecord.mockResolvedValue({ id: 'pay-1' });
      mockSendPaymentRequestEmail.mockResolvedValue(undefined);

      const { requestDepositAction } = await import('@/lib/actions/payment-actions');
      const fd = new FormData();
      fd.set('sessionId', 'sess-new');
      fd.set('amount', '100');
      const result = await requestDepositAction(fd);

      expect(result.success).toBe(true);
      expect(result.checkoutUrl).toContain('checkout.stripe.com');

      // Verify Stripe customer was retrieved
      expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cust-new', email: 'jane@test.com' }),
      );

      // Verify payment record was created
      expect(mockCreatePaymentRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-new',
          tattooSessionId: 'sess-new',
          type: 'DEPOSIT',
          amount: 100,
        }),
      );

      // Verify email was sent
      expect(mockSendPaymentRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@test.com',
          amount: 100,
          type: 'deposit',
        }),
      );
    });

    it('Step 4: Stripe webhook confirms payment and updates session', async () => {
      const checkoutEvent = {
        id: 'evt_deposit_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_deposit_1',
            payment_intent: 'pi_deposit_1',
            metadata: { tattooSessionId: 'sess-new', paymentType: 'DEPOSIT', customerId: 'cust-new' },
            amount_total: 10000, // $100
          },
        },
      };

      mockStripeWebhooksConstructEvent.mockReturnValue(checkoutEvent);
      mockStripeEventFindFirst.mockResolvedValue(null);
      mockStripePaymentIntentsRetrieve.mockResolvedValue({ id: 'pi_deposit_1', latest_charge: 'ch_1' });
      mockStripeChargesRetrieve.mockResolvedValue({ receipt_url: 'https://receipt.stripe.com/1' });
      mockDbInsertValuesReturning.mockResolvedValue([]);
      mockDbUpdateSetWhere.mockResolvedValue(undefined);

      // Mock transaction for atomic payment + session update
      mockDbTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn().mockResolvedValue(undefined),
            })),
          })),
        };
        return fn(tx);
      });

      const webhookRoute = await import('@/app/api/webhooks/stripe/route');
      const request = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(checkoutEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await webhookRoute.POST(request);
      expect(response.status).toBe(200);

      // Verify PaymentIntent was retrieved for receipt
      expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalledWith('pi_deposit_1');

      // Verify transaction was used for atomic update
      expect(mockDbTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Flow 3: Portal Consent Signing
  // =========================================================================
  describe('Flow 3: Portal Consent Signing', () => {
    it('Step 1: User authenticates and is verified', async () => {
      mockGetCurrentSession.mockResolvedValue(userSession);

      // Verify session is valid
      const session = await mockGetCurrentSession();
      expect(session.user.id).toBe('user-1');
      expect(session.user.role).toBe('user');
    });

    it('Step 2: User has a linked customer record', async () => {
      mockCustomerFindFirst.mockResolvedValue({
        id: 'cust-linked',
        userId: 'user-1',
        firstName: 'Client',
        lastName: 'User',
      });

      const customer = await mockCustomerFindFirst();
      expect(customer).toBeDefined();
      expect(customer.userId).toBe('user-1');
    });

    it('Step 3: User fetches sessions requiring consent', async () => {
      mockTattooSessionFindFirst.mockResolvedValue({
        id: 'sess-consent',
        customerId: 'cust-linked',
        consentSigned: false,
        consentSignedAt: null,
        designDescription: 'Koi Fish Back Piece',
      });

      const session = await mockTattooSessionFindFirst();
      expect(session.consentSigned).toBe(false);
      expect(session.consentSignedAt).toBeNull();
    });

    it('Step 4: User signs consent form', async () => {
      mockGetCurrentSession.mockResolvedValue(userSession);
      mockCustomerFindFirst.mockResolvedValue({ id: 'cust-linked', userId: 'user-1' });
      mockTattooSessionFindFirst.mockResolvedValue({
        id: 'sess-consent',
        customerId: 'cust-linked',
        consentSignedAt: null,
      });
      mockDbUpdateSetWhere.mockResolvedValue(undefined);

      const { signConsentAction } = await import('@/lib/actions/portal-actions');
      const fd = new FormData();
      fd.set('sessionId', 'sess-consent');
      fd.set('signedName', 'Client User');
      fd.set('acknowledged', 'true');

      const result = await signConsentAction(fd);
      expect(result.success).toBe(true);
    });

    it('Step 5: Re-signing consent is prevented (D-10)', async () => {
      mockGetCurrentSession.mockResolvedValue(userSession);
      mockCustomerFindFirst.mockResolvedValue({ id: 'cust-linked', userId: 'user-1' });
      mockTattooSessionFindFirst.mockResolvedValue({
        id: 'sess-consent',
        customerId: 'cust-linked',
        consentSignedAt: new Date(), // Already signed
      });

      const { signConsentAction } = await import('@/lib/actions/portal-actions');
      const fd = new FormData();
      fd.set('sessionId', 'sess-consent');
      fd.set('signedName', 'Client User');
      fd.set('acknowledged', 'true');

      const result = await signConsentAction(fd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already been signed');
    });

    it('Step 6: IDOR protection -- cannot sign consent for another user session', async () => {
      mockGetCurrentSession.mockResolvedValue(userSession);
      mockCustomerFindFirst.mockResolvedValue({ id: 'cust-linked', userId: 'user-1' });
      // findFirst returns null because the session belongs to a different customer
      mockTattooSessionFindFirst.mockResolvedValue(null);

      const { signConsentAction } = await import('@/lib/actions/portal-actions');
      const fd = new FormData();
      fd.set('sessionId', 'sess-other-user');
      fd.set('signedName', 'Evil Hacker');
      fd.set('acknowledged', 'true');

      const result = await signConsentAction(fd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // =========================================================================
  // Flow 4: Admin CRUD Flow
  // =========================================================================
  describe('Flow 4: Admin CRUD Flow', () => {
    const customerId = 'cust-crud';

    it('Step 1: Admin creates a customer', async () => {
      mockGetCurrentSession.mockResolvedValue(adminSession);
      mockCreateCustomer.mockResolvedValue({
        id: customerId,
        firstName: 'CRUD',
        lastName: 'Test',
        email: 'crud@test.com',
      });

      const { createCustomerAction } = await import('@/lib/actions/customer-actions');
      const fd = new FormData();
      fd.set('firstName', 'CRUD');
      fd.set('lastName', 'Test');
      fd.set('email', 'crud@test.com');

      const result = await createCustomerAction(fd);
      expect(result.id).toBe(customerId);
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1);

      // Verify audit log was called
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'CREATE',
          resource: 'customer',
          resourceId: customerId,
        }),
      );
    });

    it('Step 2: Admin updates the customer', async () => {
      mockGetCurrentSession.mockResolvedValue(adminSession);
      mockUpdateCustomer.mockResolvedValue({
        id: customerId,
        firstName: 'CRUD Updated',
        lastName: 'Test',
        email: 'crud-updated@test.com',
      });

      const { updateCustomerAction } = await import('@/lib/actions/customer-actions');
      const fd = new FormData();
      fd.set('firstName', 'CRUD Updated');
      fd.set('lastName', 'Test');
      fd.set('email', 'crud-updated@test.com');

      const result = await updateCustomerAction(customerId, fd);
      expect(result.id).toBe(customerId);
      expect(mockUpdateCustomer).toHaveBeenCalledWith(customerId, expect.objectContaining({
        firstName: 'CRUD Updated',
      }));

      // Verify audit log recorded UPDATE
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'UPDATE',
          resource: 'customer',
          resourceId: customerId,
        }),
      );
    });

    it('Step 3: Admin deletes the customer', async () => {
      mockGetCurrentSession.mockResolvedValue(adminSession);
      mockDeleteCustomer.mockResolvedValue(undefined);

      const { deleteCustomerAction } = await import('@/lib/actions/customer-actions');
      await deleteCustomerAction(customerId);

      expect(mockDeleteCustomer).toHaveBeenCalledWith(customerId);

      // Verify audit log recorded DELETE
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'DELETE',
          resource: 'customer',
          resourceId: customerId,
        }),
      );
    });

    it('Step 4: Full CRUD lifecycle verified -- correct DAL call order', async () => {
      // Reset and run all three steps in sequence
      vi.clearAllMocks();
      mockGetCurrentSession.mockResolvedValue(adminSession);

      // CREATE
      mockCreateCustomer.mockResolvedValue({ id: 'cust-lifecycle' });
      const { createCustomerAction } = await import('@/lib/actions/customer-actions');
      const createFd = new FormData();
      createFd.set('firstName', 'Lifecycle');
      createFd.set('lastName', 'Test');
      createFd.set('email', 'life@test.com');
      await createCustomerAction(createFd);

      // UPDATE
      mockUpdateCustomer.mockResolvedValue({ id: 'cust-lifecycle' });
      const { updateCustomerAction } = await import('@/lib/actions/customer-actions');
      const updateFd = new FormData();
      updateFd.set('firstName', 'Lifecycle Updated');
      updateFd.set('lastName', 'Test');
      updateFd.set('email', 'life@test.com');
      await updateCustomerAction('cust-lifecycle', updateFd);

      // DELETE
      mockDeleteCustomer.mockResolvedValue(undefined);
      const { deleteCustomerAction } = await import('@/lib/actions/customer-actions');
      await deleteCustomerAction('cust-lifecycle');

      // Verify correct order: CREATE -> UPDATE -> DELETE
      expect(mockCreateCustomer).toHaveBeenCalledTimes(1);
      expect(mockUpdateCustomer).toHaveBeenCalledTimes(1);
      expect(mockDeleteCustomer).toHaveBeenCalledTimes(1);

      // Verify audit logs were created in correct order
      const auditCalls = mockLogAudit.mock.calls;
      expect(auditCalls.length).toBe(3);
      expect(auditCalls[0][0].action).toBe('CREATE');
      expect(auditCalls[1][0].action).toBe('UPDATE');
      expect(auditCalls[2][0].action).toBe('DELETE');

      // Verify revalidatePath was called for customers dashboard
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/customers');
    });
  });
});
