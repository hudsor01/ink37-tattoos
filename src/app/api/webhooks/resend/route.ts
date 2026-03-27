import { NextResponse } from 'next/server';

interface ResendWebhookEvent {
  type: string;
  data: {
    to?: string[];
    email_id?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: Request) {
  let body: ResendWebhookEvent;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

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
