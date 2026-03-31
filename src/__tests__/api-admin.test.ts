import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockGetCustomers = vi.fn();
const mockGetMediaItems = vi.fn();
const mockGetAppointments = vi.fn();
const mockGetSessions = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/security/rate-limiter', () => ({
  rateLimiters: {
    admin: { limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }) },
    upload: { limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 }) },
  },
  getRequestIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn().mockReturnValue(Response.json({ error: 'Too many requests' }, { status: 429 })),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Mock DAL modules -- the admin routes call these directly.
// The DAL functions internally call requireStaffRole() which calls getCurrentSession.
// When getCurrentSession returns null, requireStaffRole calls redirect('/login'),
// but redirect throws a Next.js navigation error. In the route handler's try/catch,
// this is caught and returns 401.
vi.mock('@/lib/dal/customers', () => ({
  getCustomers: (...args: unknown[]) => mockGetCustomers(...args),
}));

vi.mock('@/lib/dal/media', () => ({
  getMediaItems: (...args: unknown[]) => mockGetMediaItems(...args),
}));

vi.mock('@/lib/dal/appointments', () => ({
  getAppointments: (...args: unknown[]) => mockGetAppointments(...args),
}));

vi.mock('@/lib/dal/sessions', () => ({
  getSessions: (...args: unknown[]) => mockGetSessions(...args),
}));

const adminSession = {
  user: { id: 'test-user', role: 'admin', email: 'admin@test.com' },
  session: { id: 'test-session' },
};

/** Create a mock Request for route handlers that need the request parameter */
function mockRequest(path: string) {
  return new Request(`http://localhost${path}`);
}

describe('Admin Customers API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when DAL rejects unauthenticated request', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    mockGetCustomers.mockRejectedValue(new Error('Unauthorized'));

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET(mockRequest('/api/admin/customers'));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when DAL rejects insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockGetCustomers.mockRejectedValue(new Error('Insufficient permissions: requires staff role or above'));

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET(mockRequest('/api/admin/customers'));
    // Route checks role and returns 403 for non-admin users
    expect(response.status).toBe(403);
  });

  it('returns 200 with customer data on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const mockCustomerData = [
      { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '555-0100', createdAt: new Date() },
      { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', phone: '555-0101', createdAt: new Date() },
    ];
    mockGetCustomers.mockResolvedValue(mockCustomerData);

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET(mockRequest('/api/admin/customers'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockCustomerData);
    expect(data).toHaveLength(2);
  });

  it('returns 200 with empty array when no customers', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockGetCustomers.mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET(mockRequest('/api/admin/customers'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });
});

describe('Admin Media API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when DAL rejects unauthenticated request', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    mockGetMediaItems.mockRejectedValue(new Error('Unauthorized'));

    const { GET } = await import('@/app/api/admin/media/route');
    const request = new Request('http://localhost/api/admin/media');
    const response = await GET(request as never);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    mockGetMediaItems.mockRejectedValue(new Error('Insufficient permissions'));

    const { GET } = await import('@/app/api/admin/media/route');
    const request = new Request('http://localhost/api/admin/media');
    const response = await GET(request as never);
    expect(response.status).toBe(403);
  });

  it('returns 200 with media items on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const mockMediaData = [
      { id: '1', type: 'image', url: 'https://blob.example.com/img1.jpg', artist: { name: 'Artist' } },
    ];
    mockGetMediaItems.mockResolvedValue(mockMediaData);

    const { GET } = await import('@/app/api/admin/media/route');
    const url = new URL('http://localhost/api/admin/media');
    const request = new Request(url);
    Object.defineProperty(request, 'nextUrl', { value: url });
    const response = await GET(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockMediaData);
  });
});

describe('Admin Appointments API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentSession.mockResolvedValue(null);

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET(mockRequest('/api/admin/appointments'));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET(mockRequest('/api/admin/appointments'));
    expect(response.status).toBe(403);
  });

  it('returns 200 with appointments on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const mockAppointmentData = [
      {
        id: 'apt-1',
        scheduledDate: new Date(),
        status: 'CONFIRMED',
        customer: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      },
    ];
    mockGetAppointments.mockResolvedValue(mockAppointmentData);

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET(mockRequest('/api/admin/appointments'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAppointmentData);
  });
});

describe('Admin Sessions API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentSession.mockResolvedValue(null);

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET(mockRequest('/api/admin/sessions'));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET(mockRequest('/api/admin/sessions'));
    expect(response.status).toBe(403);
  });

  it('returns 200 with sessions on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const mockSessionData = [
      { id: 'sess-1', status: 'SCHEDULED', designDescription: 'Rose tattoo' },
    ];
    mockGetSessions.mockResolvedValue(mockSessionData);

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET(mockRequest('/api/admin/sessions'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockSessionData);
  });

  it('returns 200 with empty array when no sessions', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockGetSessions.mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET(mockRequest('/api/admin/sessions'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });
});
