import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import Stripe from 'stripe';

// Stripe SDK defaults to NodeHttpClient (https.request + custom Agent),
// which MSW cannot intercept. Using createFetchHttpClient() routes through
// globalThis.fetch, which MSW intercepts at the network level.
// This tests the real Stripe SDK response parsing — not our Proxy wrapper,
// but the actual SDK-to-HTTP pipeline that our wrapper delegates to.

const server = setupServer(
  http.post('https://api.stripe.com/v1/setup_intents', () => {
    return HttpResponse.json(
      {
        id: 'seti_msw_001',
        object: 'setup_intent',
        client_secret: 'seti_msw_001_secret_xyz',
        status: 'requires_payment_method',
        payment_method_types: ['card'],
        customer: 'cus_msw_test',
        livemode: false,
        created: Math.floor(Date.now() / 1000),
      },
      { headers: { 'Request-Id': 'req_msw_001' } },
    );
  }),

  http.get('https://api.stripe.com/v1/payment_methods', () => {
    return HttpResponse.json(
      {
        object: 'list',
        data: [
          {
            id: 'pm_msw_visa',
            object: 'payment_method',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2027,
              funding: 'credit',
              country: 'US',
            },
            created: Math.floor(Date.now() / 1000),
            livemode: false,
          },
          {
            id: 'pm_msw_mc',
            object: 'payment_method',
            type: 'card',
            card: {
              brand: 'mastercard',
              last4: '5555',
              exp_month: 6,
              exp_year: 2026,
              funding: 'debit',
              country: 'US',
            },
            created: Math.floor(Date.now() / 1000),
            livemode: false,
          },
        ],
        has_more: false,
        url: '/v1/payment_methods',
      },
      { headers: { 'Request-Id': 'req_msw_002' } },
    );
  }),

  http.get('https://api.stripe.com/v1/payment_intents/:id', ({ params }) => {
    return HttpResponse.json(
      {
        id: params.id,
        object: 'payment_intent',
        status: 'succeeded',
        amount: 15000,
        currency: 'usd',
        latest_charge: 'ch_msw_001',
        livemode: false,
        created: Math.floor(Date.now() / 1000),
      },
      { headers: { 'Request-Id': 'req_msw_003' } },
    );
  }),

  http.get('https://api.stripe.com/v1/charges/:id', ({ params }) => {
    return HttpResponse.json(
      {
        id: params.id,
        object: 'charge',
        amount: 15000,
        currency: 'usd',
        receipt_url: 'https://pay.stripe.com/receipts/msw-test',
        status: 'succeeded',
        livemode: false,
        created: Math.floor(Date.now() / 1000),
      },
      { headers: { 'Request-Id': 'req_msw_004' } },
    );
  }),
);

let stripeClient: Stripe;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  stripeClient = new Stripe('sk_test_msw_integration', {
    httpClient: Stripe.createFetchHttpClient(),
  });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Stripe SDK via MSW (fetch transport)', () => {
  describe('setupIntents', () => {
    it('creates a setup intent and returns typed response', async () => {
      const intent = await stripeClient.setupIntents.create({
        customer: 'cus_msw_test',
        payment_method_types: ['card'],
      });

      expect(intent.id).toBe('seti_msw_001');
      expect(intent.client_secret).toBe('seti_msw_001_secret_xyz');
      expect(intent.status).toBe('requires_payment_method');
      expect(intent.customer).toBe('cus_msw_test');
    });

    it('propagates 400 as StripeInvalidRequestError', async () => {
      server.use(
        http.post('https://api.stripe.com/v1/setup_intents', () => {
          return HttpResponse.json(
            {
              error: {
                type: 'invalid_request_error',
                message: 'No such customer: cus_bad',
                code: 'resource_missing',
                param: 'customer',
              },
            },
            { status: 400, headers: { 'Request-Id': 'req_msw_err' } },
          );
        }),
      );

      await expect(
        stripeClient.setupIntents.create({
          customer: 'cus_bad',
          payment_method_types: ['card'],
        }),
      ).rejects.toThrow(/No such customer/);
    });
  });

  describe('paymentMethods', () => {
    it('lists payment methods with card details', async () => {
      const methods = await stripeClient.paymentMethods.list({
        customer: 'cus_msw_test',
        type: 'card',
      });

      expect(methods.data).toHaveLength(2);
      expect(methods.data[0].id).toBe('pm_msw_visa');
      expect(methods.data[0].card?.brand).toBe('visa');
      expect(methods.data[0].card?.last4).toBe('4242');
      expect(methods.data[1].id).toBe('pm_msw_mc');
      expect(methods.data[1].card?.brand).toBe('mastercard');
    });

    it('returns empty list when customer has no methods', async () => {
      server.use(
        http.get('https://api.stripe.com/v1/payment_methods', () => {
          return HttpResponse.json(
            { object: 'list', data: [], has_more: false, url: '/v1/payment_methods' },
            { headers: { 'Request-Id': 'req_msw_empty' } },
          );
        }),
      );

      const methods = await stripeClient.paymentMethods.list({
        customer: 'cus_empty',
        type: 'card',
      });

      expect(methods.data).toEqual([]);
    });

    it('handles 429 rate limit as StripeRateLimitError', async () => {
      server.use(
        http.get('https://api.stripe.com/v1/payment_methods', () => {
          return HttpResponse.json(
            {
              error: {
                type: 'rate_limit_error',
                message: 'Too many requests',
              },
            },
            { status: 429, headers: { 'Request-Id': 'req_429' } },
          );
        }),
      );

      await expect(
        stripeClient.paymentMethods.list({ customer: 'cus_rate', type: 'card' }),
      ).rejects.toThrow(/Too many requests/);
    });
  });

  describe('paymentIntents + charges (webhook helper chain)', () => {
    it('retrieves payment intent with latest_charge', async () => {
      const pi = await stripeClient.paymentIntents.retrieve('pi_msw_test');

      expect(pi.id).toBe('pi_msw_test');
      expect(pi.status).toBe('succeeded');
      expect(pi.latest_charge).toBe('ch_msw_001');
    });

    it('retrieves charge with receipt_url', async () => {
      const charge = await stripeClient.charges.retrieve('ch_msw_001');

      expect(charge.id).toBe('ch_msw_001');
      expect(charge.receipt_url).toBe('https://pay.stripe.com/receipts/msw-test');
    });

    it('full webhook chain: intent -> charge -> receipt_url', async () => {
      const pi = await stripeClient.paymentIntents.retrieve('pi_chain_test');
      expect(pi.latest_charge).toBe('ch_msw_001');

      const charge = await stripeClient.charges.retrieve(pi.latest_charge as string);
      expect(charge.receipt_url).toBe('https://pay.stripe.com/receipts/msw-test');
    });
  });

  describe('listPaymentMethods mapping (mirrors production wrapper)', () => {
    it('maps SDK response to simplified shape matching our wrapper output', async () => {
      const methods = await stripeClient.paymentMethods.list({
        customer: 'cus_msw_test',
        type: 'card',
      });

      // This is the exact mapping our listPaymentMethods wrapper performs
      const mapped = methods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? 'unknown',
        last4: pm.card?.last4 ?? '****',
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      }));

      expect(mapped).toEqual([
        { id: 'pm_msw_visa', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027 },
        { id: 'pm_msw_mc', brand: 'mastercard', last4: '5555', expMonth: 6, expYear: 2026 },
      ]);
    });
  });
});
