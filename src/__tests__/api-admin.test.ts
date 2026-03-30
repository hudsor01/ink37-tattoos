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

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
  NextRequest: class {
    nextUrl: URL;
    constructor(url: string) {
      this.nextUrl = new URL(url);
    }
  },
}));

describe('Admin API: /api/admin/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 for staff role (not admin)', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'staff' } });
    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('returns 200 with customers for admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const mockCustomers = [{ id: 'c1', firstName: 'John', lastName: 'Doe' }];
    mockGetCustomers.mockResolvedValue(mockCustomers);

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockCustomers);
  });

  it('returns 200 with customers for super_admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'super_admin' } });
    mockGetCustomers.mockResolvedValue([]);

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('returns 500 when DAL throws', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    mockGetCustomers.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/admin/customers/route');
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('Admin API: /api/admin/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/media/route');
    // Construct a NextRequest-like object with nextUrl
    const request = { nextUrl: new URL('http://localhost/api/admin/media') } as never;
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    const { GET } = await import('@/app/api/admin/media/route');
    const request = { nextUrl: new URL('http://localhost/api/admin/media') } as never;
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('returns 200 with media items for admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const mockMedia = { items: [], total: 0 };
    mockGetMediaItems.mockResolvedValue(mockMedia);

    const { GET } = await import('@/app/api/admin/media/route');
    const request = {
      nextUrl: new URL('http://localhost/api/admin/media?page=1&pageSize=20'),
    } as never;
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockMedia);
  });

  it('passes query parameters to DAL', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    mockGetMediaItems.mockResolvedValue({ items: [], total: 0 });

    const { GET } = await import('@/app/api/admin/media/route');
    const request = {
      nextUrl: new URL('http://localhost/api/admin/media?tag=sleeve&approvalStatus=approved&search=dragon&page=2&pageSize=10'),
    } as never;
    await GET(request);

    expect(mockGetMediaItems).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      search: 'dragon',
      tag: 'sleeve',
      approvalStatus: 'approved',
    });
  });

  it('returns 500 when DAL throws', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    mockGetMediaItems.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/admin/media/route');
    const request = { nextUrl: new URL('http://localhost/api/admin/media') } as never;
    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});

describe('Admin API: /api/admin/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'manager' } });
    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('returns 200 with appointments for admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const mockAppts = [{ id: 'a1', status: 'CONFIRMED' }];
    mockGetAppointments.mockResolvedValue(mockAppts);

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockAppts);
  });

  it('returns 500 when DAL throws', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    mockGetAppointments.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/admin/appointments/route');
    const response = await GET();
    expect(response.status).toBe(500);
  });
});

describe('Admin API: /api/admin/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns 403 when user has insufficient role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('returns 200 with sessions for admin role', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    const mockSessData = [{ id: 's1', status: 'COMPLETED' }];
    mockGetSessions.mockResolvedValue(mockSessData);

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockSessData);
  });

  it('returns 500 when DAL throws', async () => {
    mockGetCurrentSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
    mockGetSessions.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/admin/sessions/route');
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
