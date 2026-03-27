import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const {
  mockGetCurrentSession,
  mockRedirect,
  mockPreparedExecute,
  mockSelectTerminal,
  mockAppointmentFindMany,
  mockCustomerFindFirst,
} = vi.hoisted(() => ({
  mockGetCurrentSession: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  mockPreparedExecute: vi.fn(),
  mockSelectTerminal: vi.fn().mockResolvedValue([]),
  mockAppointmentFindMany: vi.fn().mockResolvedValue([]),
  mockCustomerFindFirst: vi.fn().mockResolvedValue(null),
}));

vi.mock('server-only', () => ({}));
vi.mock('react', () => ({ cache: (fn: Function) => fn }));
vi.mock('@/lib/auth', () => ({ getCurrentSession: mockGetCurrentSession }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          prepare: vi.fn(() => ({ execute: mockPreparedExecute })),
          orderBy: mockSelectTerminal,
        })),
        prepare: vi.fn(() => ({ execute: mockPreparedExecute })),
        orderBy: mockSelectTerminal,
      })),
    })),
    query: {
      appointment: {
        findMany: mockAppointmentFindMany,
        findFirst: vi.fn().mockResolvedValue(null),
      },
      customer: {
        findFirst: mockCustomerFindFirst,
      },
    },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  customer: { id: 'id', email: 'email', userId: 'userId', createdAt: 'createdAt' },
  appointment: { id: 'id', scheduledDate: 'scheduledDate', status: 'status', customerId: 'customerId', type: 'type' },
  tattooSession: { id: 'id', status: 'status', totalCost: 'totalCost', appointmentDate: 'appointmentDate', customerId: 'customerId', consentSigned: 'consentSigned' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gte: vi.fn((...args: unknown[]) => args),
  lte: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  asc: vi.fn((col: unknown) => col),
  sql: vi.fn(),
  not: vi.fn((arg: unknown) => arg),
  inArray: vi.fn((...args: unknown[]) => args),
  between: vi.fn((...args: unknown[]) => args),
  count: vi.fn(() => 'count_fn'),
  sum: vi.fn(() => 'sum_fn'),
}));

const staffSession = { user: { id: 'u1', role: 'staff', email: 'staff@test.com' } };

describe('checkSchedulingConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetCurrentSession.mockResolvedValue(staffSession);
  });

  it('returns false when no appointments in range', async () => {
    mockAppointmentFindMany.mockResolvedValue([]);
    const { checkSchedulingConflict } = await import('@/lib/dal/appointments');
    const result = await checkSchedulingConflict(new Date(2025, 5, 15, 10, 0));
    expect(result).toBe(false);
  });

  it('returns true when appointment overlaps proposed time', async () => {
    // 11:00 is within [10:00, 12:00] (default 2-hour window)
    mockAppointmentFindMany.mockResolvedValue([
      { scheduledDate: new Date(2025, 5, 15, 11, 0) },
    ]);
    const { checkSchedulingConflict } = await import('@/lib/dal/appointments');
    const result = await checkSchedulingConflict(new Date(2025, 5, 15, 10, 0));
    expect(result).toBe(true);
  });

  it('returns false when appointment is outside proposed window', async () => {
    // 13:00 is outside [10:00, 12:00] (default 2-hour window)
    mockAppointmentFindMany.mockResolvedValue([
      { scheduledDate: new Date(2025, 5, 15, 13, 0) },
    ]);
    const { checkSchedulingConflict } = await import('@/lib/dal/appointments');
    const result = await checkSchedulingConflict(new Date(2025, 5, 15, 10, 0));
    expect(result).toBe(false);
  });

  it('uses custom durationHours when provided', async () => {
    // With 4-hour window [10:00, 14:00], 13:00 IS within range
    mockAppointmentFindMany.mockResolvedValue([
      { scheduledDate: new Date(2025, 5, 15, 13, 0) },
    ]);
    const { checkSchedulingConflict } = await import('@/lib/dal/appointments');
    const result = await checkSchedulingConflict(new Date(2025, 5, 15, 10, 0), 4);
    expect(result).toBe(true);
  });
});

describe('getDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockAppointmentFindMany.mockResolvedValue([]);
  });

  it('returns correct shape with all 5 fields', async () => {
    mockPreparedExecute
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([{ count: 10 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ total: '1500' }]);
    mockAppointmentFindMany.mockResolvedValue([{ id: 'a1' }]);

    const { getDashboardStats } = await import('@/lib/dal/analytics');
    const result = await getDashboardStats();

    expect(result).toEqual({
      totalCustomers: 5,
      totalAppointments: 10,
      completedSessions: 3,
      totalRevenue: 1500,
      recentAppointments: [{ id: 'a1' }],
    });
  });

  it('defaults totalRevenue to 0 when sum is null', async () => {
    mockPreparedExecute
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ total: null }]);

    const { getDashboardStats } = await import('@/lib/dal/analytics');
    const result = await getDashboardStats();
    expect(result.totalRevenue).toBe(0);
  });

  it('includes recentAppointments from findMany', async () => {
    mockPreparedExecute.mockResolvedValue([{ count: 0 }]);
    const appts = [{ id: 'a1' }, { id: 'a2' }];
    mockAppointmentFindMany.mockResolvedValue(appts);

    const { getDashboardStats } = await import('@/lib/dal/analytics');
    const result = await getDashboardStats();
    expect(result.recentAppointments).toEqual(appts);
  });
});

describe('getRevenueData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockSelectTerminal.mockResolvedValue([]);
  });

  it('aggregates sessions by month correctly', async () => {
    mockSelectTerminal.mockResolvedValue([
      { appointmentDate: new Date(2025, 5, 15), totalCost: 500 },
      { appointmentDate: new Date(2025, 5, 20), totalCost: 300 },
      { appointmentDate: new Date(2025, 6, 10), totalCost: 400 },
    ]);

    const { getRevenueData } = await import('@/lib/dal/analytics');
    const result = await getRevenueData();

    expect(result).toEqual([
      { month: '2025-06', revenue: 800, count: 2 },
      { month: '2025-07', revenue: 400, count: 1 },
    ]);
  });

  it('returns empty array when no sessions', async () => {
    mockSelectTerminal.mockResolvedValue([]);

    const { getRevenueData } = await import('@/lib/dal/analytics');
    const result = await getRevenueData();
    expect(result).toEqual([]);
  });
});

describe('getBookingTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockSelectTerminal.mockResolvedValue([]);
  });

  it('counts CANCELLED and NO_SHOW as cancellations, others as bookings', async () => {
    mockSelectTerminal.mockResolvedValue([
      { scheduledDate: new Date(2025, 5, 16, 10, 0), status: 'CONFIRMED' },
      { scheduledDate: new Date(2025, 5, 17, 10, 0), status: 'CANCELLED' },
      { scheduledDate: new Date(2025, 5, 18, 10, 0), status: 'NO_SHOW' },
    ]);

    const { getBookingTrends } = await import('@/lib/dal/analytics');
    const result = await getBookingTrends();

    expect(result[0].bookings).toBe(1);
    expect(result[0].cancellations).toBe(2);
  });

  it('groups by week using startOfWeek', async () => {
    // June 16 (Monday) and June 23 (Monday) are different weeks
    mockSelectTerminal.mockResolvedValue([
      { scheduledDate: new Date(2025, 5, 16, 10, 0), status: 'CONFIRMED' },
      { scheduledDate: new Date(2025, 5, 23, 10, 0), status: 'CONFIRMED' },
    ]);

    const { getBookingTrends } = await import('@/lib/dal/analytics');
    const result = await getBookingTrends();

    expect(result).toHaveLength(2);
    expect(result[0].bookings).toBe(1);
    expect(result[1].bookings).toBe(1);
  });
});

describe('Portal Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('redirects to /login when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { getPortalAppointments } = await import('@/lib/dal/portal');
    await expect(getPortalAppointments()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects to /portal/no-account when no customer', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue(null);
    const { getPortalAppointments } = await import('@/lib/dal/portal');
    await expect(getPortalAppointments()).rejects.toThrow('REDIRECT:/portal/no-account');
  });

  it('returns appointments on success', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue({ id: 'c1' });
    mockAppointmentFindMany.mockResolvedValue([{ id: 'a1' }]);
    const { getPortalAppointments } = await import('@/lib/dal/portal');
    const result = await getPortalAppointments();
    expect(result).toEqual([{ id: 'a1' }]);
  });
});
