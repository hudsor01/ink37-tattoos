import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Module-scope mocks
const mockDbExecute = vi.fn();
const mockSendBalanceDueReminder = vi.fn();
const mockSendNoShowFollowUp = vi.fn();
const mockCreateNotificationForAdmins = vi.fn();
const mockDbSelect = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/db', () => ({
  db: {
    execute: (...args: unknown[]) => mockDbExecute(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  tattooSession: { id: 'id', totalCost: 'totalCost', status: 'status' },
  payment: { tattooSessionId: 'tattooSessionId', status: 'status', amount: 'amount' },
  customer: { id: 'id', email: 'email', firstName: 'firstName', lastName: 'lastName' },
  appointment: { id: 'id', status: 'status', scheduledDate: 'scheduledDate', email: 'email' },
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
}));

vi.mock('@/lib/email/resend', () => ({
  sendBalanceDueReminder: (...args: unknown[]) => mockSendBalanceDueReminder(...args),
  sendNoShowFollowUp: (...args: unknown[]) => mockSendNoShowFollowUp(...args),
}));

vi.mock('@/lib/dal/notifications', () => ({
  createNotificationForAdmins: (...args: unknown[]) => mockCreateNotificationForAdmins(...args),
}));

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('March 28, 2026'),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

function makeRequest(url: string, opts?: RequestInit): Request {
  return new Request(url, {
    method: 'POST',
    ...opts,
  });
}

describe('Cron: balance-due route', () => {
  const CRON_SECRET = 'test-cron-secret-12345';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('returns 500 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const { POST } = await import('@/app/api/cron/balance-due/route');
    const response = await POST(makeRequest('http://localhost/api/cron/balance-due'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('CRON_SECRET not configured');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { POST } = await import('@/app/api/cron/balance-due/route');
    const response = await POST(makeRequest('http://localhost/api/cron/balance-due'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Bearer token is wrong', async () => {
    const { POST } = await import('@/app/api/cron/balance-due/route');
    const response = await POST(makeRequest('http://localhost/api/cron/balance-due', {
      headers: { Authorization: 'Bearer wrong-token' },
    }));
    expect(response.status).toBe(401);
  });

  it('returns 200 with processing results on valid token', async () => {
    mockDbExecute.mockResolvedValue({
      rows: [
        {
          id: 'sess-1',
          totalCost: 500,
          designDescription: 'Dragon sleeve',
          customerId: 'cust-1',
          customerEmail: 'test@example.com',
          customerFirstName: 'John',
          customerLastName: 'Doe',
          total_paid: 200,
        },
      ],
    });
    mockSendBalanceDueReminder.mockResolvedValue({ sent: true });

    const { POST } = await import('@/app/api/cron/balance-due/route');
    const response = await POST(makeRequest('http://localhost/api/cron/balance-due', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
  });

  it('tracks errors for sessions where customer has no email', async () => {
    mockDbExecute.mockResolvedValue({
      rows: [
        {
          id: 'sess-2',
          totalCost: 300,
          designDescription: 'Rose',
          customerId: 'cust-2',
          customerEmail: null,
          customerFirstName: 'Jane',
          customerLastName: 'Doe',
          total_paid: 100,
        },
      ],
    });

    const { POST } = await import('@/app/api/cron/balance-due/route');
    const response = await POST(makeRequest('http://localhost/api/cron/balance-due', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.sent).toBe(0);
    expect(body.errors).toBe(1);
  });

  it('handles email send failures gracefully', async () => {
    mockDbExecute.mockResolvedValue({
      rows: [
        {
          id: 'sess-3',
          totalCost: 400,
          designDescription: 'Phoenix',
          customerId: 'cust-3',
          customerEmail: 'test@example.com',
          customerFirstName: 'Bob',
          customerLastName: 'Smith',
          total_paid: 100,
        },
      ],
    });
    mockSendBalanceDueReminder.mockRejectedValue(new Error('Email service down'));

    const { POST } = await import('@/app/api/cron/balance-due/route');
    const response = await POST(makeRequest('http://localhost/api/cron/balance-due', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBe(1);
  });
});

describe('Cron: no-show-followup route', () => {
  const CRON_SECRET = 'test-cron-secret-12345';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    // Setup db.select chain mock
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockDbSelect.mockReturnValue({ from: mockFrom });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('returns 500 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const { POST } = await import('@/app/api/cron/no-show-followup/route');
    const response = await POST(makeRequest('http://localhost/api/cron/no-show-followup'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('CRON_SECRET not configured');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { POST } = await import('@/app/api/cron/no-show-followup/route');
    const response = await POST(makeRequest('http://localhost/api/cron/no-show-followup'));
    expect(response.status).toBe(401);
  });

  it('returns 401 when Bearer token is wrong', async () => {
    const { POST } = await import('@/app/api/cron/no-show-followup/route');
    const response = await POST(makeRequest('http://localhost/api/cron/no-show-followup', {
      headers: { Authorization: 'Bearer wrong-token' },
    }));
    expect(response.status).toBe(401);
  });

  it('returns 200 with no-show processing results', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        {
          id: 'appt-1',
          scheduledDate: new Date('2026-03-27'),
          type: 'CONSULTATION',
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
        },
      ]),
    });
    mockDbSelect.mockReturnValue({ from: mockFrom });
    mockSendNoShowFollowUp.mockResolvedValue({ sent: true });
    mockCreateNotificationForAdmins.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/cron/no-show-followup/route');
    const response = await POST(makeRequest('http://localhost/api/cron/no-show-followup', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
  });

  it('handles email send failures gracefully', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        {
          id: 'appt-2',
          scheduledDate: new Date('2026-03-27'),
          type: 'TATTOO_SESSION',
          firstName: 'Bob',
          lastName: 'Brown',
          email: 'bob@example.com',
        },
      ]),
    });
    mockDbSelect.mockReturnValue({ from: mockFrom });
    mockSendNoShowFollowUp.mockRejectedValue(new Error('Send failed'));

    const { POST } = await import('@/app/api/cron/no-show-followup/route');
    const response = await POST(makeRequest('http://localhost/api/cron/no-show-followup', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.errors).toBe(1);
  });
});
