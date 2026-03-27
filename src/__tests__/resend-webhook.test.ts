import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Top-level import — route reads env at request time, not import time
import { POST } from '@/app/api/webhooks/resend/route';

function computeSvixSignature(
  body: string,
  secret: string,
  svixId: string,
  svixTimestamp: string,
): string {
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64',
  );
  const toSign = `${svixId}.${svixTimestamp}.${body}`;
  const sig = createHmac('sha256', secretBytes).update(toSign).digest('base64');
  return `v1,${sig}`;
}

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers,
  });
}

const TEST_SECRET = 'whsec_dGVzdC1zZWNyZXQ='; // base64 of 'test-secret'

describe('Resend Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  describe('Signature Verification', () => {
    it('returns 401 when svix-id header is missing', async () => {
      const body = JSON.stringify({ type: 'email.bounced', data: {} });
      const response = await POST(makeRequest(body, {
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,fake',
      }));
      expect(response.status).toBe(401);
    });

    it('returns 401 when svix-timestamp header is missing', async () => {
      const body = JSON.stringify({ type: 'email.bounced', data: {} });
      const response = await POST(makeRequest(body, {
        'svix-id': 'msg_123',
        'svix-signature': 'v1,fake',
      }));
      expect(response.status).toBe(401);
    });

    it('returns 401 when svix-signature is invalid', async () => {
      const body = JSON.stringify({ type: 'email.bounced', data: {} });
      const response = await POST(makeRequest(body, {
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,invalidbase64signature==',
      }));
      expect(response.status).toBe(401);
    });

    it('returns 200 with valid Svix HMAC signature', async () => {
      const body = JSON.stringify({ type: 'email.delivered', data: {} });
      const svixId = 'msg_valid';
      const svixTimestamp = '1234567890';
      const signature = computeSvixSignature(body, TEST_SECRET, svixId, svixTimestamp);

      const response = await POST(makeRequest(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': signature,
      }));
      expect(response.status).toBe(200);
    });

    it('handles multiple signatures in header (one valid)', async () => {
      const body = JSON.stringify({ type: 'email.delivered', data: {} });
      const svixId = 'msg_multi';
      const svixTimestamp = '1234567890';
      const validSig = computeSvixSignature(body, TEST_SECRET, svixId, svixTimestamp);
      const multiSig = `v1,invalidsig== ${validSig}`;

      const response = await POST(makeRequest(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': multiSig,
      }));
      expect(response.status).toBe(200);
    });
  });

  describe('Event Handling', () => {
    function makeValidRequest(body: string) {
      const svixId = 'msg_event';
      const svixTimestamp = '1234567890';
      const signature = computeSvixSignature(body, TEST_SECRET, svixId, svixTimestamp);
      return makeRequest(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': signature,
      });
    }

    it('logs warning for email.bounced event', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const body = JSON.stringify({ type: 'email.bounced', data: { to: ['user@test.com'], email_id: 'em_1' } });
      const response = await POST(makeValidRequest(body));
      expect(response.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Email bounced: user@test.com'), expect.anything());
      warnSpy.mockRestore();
    });

    it('logs warning for email.complained event', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const body = JSON.stringify({ type: 'email.complained', data: { to: ['spam@test.com'], email_id: 'em_2' } });
      const response = await POST(makeValidRequest(body));
      expect(response.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Spam complaint: spam@test.com'), expect.anything());
      warnSpy.mockRestore();
    });

    it('returns 200 for unknown event types', async () => {
      const body = JSON.stringify({ type: 'email.sent', data: {} });
      const response = await POST(makeValidRequest(body));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('skips verification and returns 200 when no secret configured', async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;
      const body = JSON.stringify({ type: 'email.delivered', data: {} });
      const response = await POST(makeRequest(body));
      expect(response.status).toBe(200);
    });

    it('returns 400 for invalid JSON body', async () => {
      const svixId = 'msg_badjson';
      const svixTimestamp = '1234567890';
      const badBody = 'not json{{{';
      const signature = computeSvixSignature(badBody, TEST_SECRET, svixId, svixTimestamp);
      const response = await POST(makeRequest(badBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': signature,
      }));
      expect(response.status).toBe(400);
    });
  });
});
