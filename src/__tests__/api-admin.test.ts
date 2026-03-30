import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockGetCustomers = vi.fn();
const mockGetMediaItems = vi.fn();
const mockGetAppointments = vi.fn();
const mockGetSessions = vi.fn();

vi.mock('server-only', () => ({}));

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

describe('Admin Customers API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when DAL rejects unauthenticated request', async () => {
    mockGetCustomers.mockRejectedValue(new Error('Unauthorized'));

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when DAL rejects insufficient role', async () => {
    mockGetCustomers.mockRejectedValue(new Error('Insufficient permissions: requires staff role or above'));

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 200 with customer data on success', async () => {
    const mockCustomerData = [
      { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '555-0100', createdAt: new Date() },
      { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', phone: '555-0101', createdAt: new Date() },
    ];
    mockGetCustomers.mockResolvedValue(mockCustomerData);

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockCustomerData);
    expect(data).toHaveLength(2);
  });

  it('returns 200 with empty array when no customers', async () => {
    mockGetCustomers.mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
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
    mockGetMediaItems.mockRejectedValue(new Error('Unauthorized'));

    const { GET } = await import('@/app/api/admin/media/route');
    const response = await GET();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when DAL rejects insufficient role', async () => {
    mockGetMediaItems.mockRejectedValue(new Error('Insufficient permissions'));

    const { GET } = await import('@/app/api/admin/media/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 200 with media items on success', async () => {
    const mockMediaData = [
      { id: '1', type: 'image', url: 'https://blob.example.com/img1.jpg', artist: { name: 'Artist' } },
    ];
    mockGetMediaItems.mockResolvedValue(mockMediaData);

    const { GET } = await import('@/app/api/admin/media/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockMediaData);
  });
});

describe('Admin Appointments API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when DAL rejects unauthenticated request', async () => {
    mockGetAppointments.mockRejectedValue(new Error('Unauthorized'));

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when DAL rejects insufficient role', async () => {
    mockGetAppointments.mockRejectedValue(new Error('Insufficient permissions'));

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 200 with appointments on success', async () => {
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
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockAppointmentData);
  });
});

describe('Admin Sessions API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when DAL rejects unauthenticated request', async () => {
    mockGetSessions.mockRejectedValue(new Error('Unauthorized'));

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when DAL rejects insufficient role', async () => {
    mockGetSessions.mockRejectedValue(new Error('Insufficient permissions'));

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 200 with sessions on success', async () => {
    const mockSessionData = [
      { id: 'sess-1', status: 'SCHEDULED', designDescription: 'Rose tattoo' },
    ];
    mockGetSessions.mockResolvedValue(mockSessionData);

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockSessionData);
  });

  it('returns 200 with empty array when no sessions', async () => {
    mockGetSessions.mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });
});
