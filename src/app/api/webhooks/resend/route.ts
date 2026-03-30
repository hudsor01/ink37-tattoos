import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { rateLimiters, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limiter';

interface ResendWebhookEvent {
  type: string;
  data: {
    to?: string[];
    email_id?: string;
    [key: string]: unknown;
  };
}

function verifyWebhookSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Resend/Svix secrets start with "whsec_" followed by base64
  const secretBytes = Buffer.from(
    secret.startsWith('whsec_') ? secret.slice(6) : secret,
    'base64'
  );

  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretBytes)
    .update(toSign)
    .digest('base64');

  // svix-signature header is "v1,<base64>" — may have multiple signatures
  const signatures = svixSignature.split(' ');
  return signatures.some((sig) => {
    const sigValue = sig.replace('v1,', '');
    try {
      return timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(sigValue)
      );
    } catch {
      return false;
    }
  });
}

export async function POST(request: Request) {
  // Rate limiting
  const ip = getRequestIp(request);
  const { success, reset } = await rateLimiters.webhook.limit(ip);
  if (!success) {
    return rateLimitResponse(reset);
  }

  const rawBody = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify signature if secret is configured
  if (secret) {
    const isValid = verifyWebhookSignature(
      rawBody,
      request.headers.get('svix-id'),
      request.headers.get('svix-timestamp'),
      request.headers.get('svix-signature'),
      secret
    );
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let body: ResendWebhookEvent;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // No revalidatePath needed -- Resend webhooks only log bounce/complaint events
  // with no DB mutations that would affect dashboard data.
  switch (body.type) {
    case 'email.bounced': {
      const bouncedEmail = body.data?.to?.[0];
      if (bouncedEmail) {
        console.warn(`[Resend] Email bounced: ${bouncedEmail}`, {
          emailId: body.data.email_id,
        });
      }
      break;
    }
    case 'email.complained': {
      const complainedEmail = body.data?.to?.[0];
      if (complainedEmail) {
        console.warn(`[Resend] Spam complaint: ${complainedEmail}`, {
          emailId: body.data.email_id,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
