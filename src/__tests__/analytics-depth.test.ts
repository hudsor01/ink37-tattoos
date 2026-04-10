import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

// Queue of results that select chains will resolve with
let selectResultQueue: unknown[][] = [];
let selectCallCount = 0;

function createChainableMock() {
  const chain: Record<string, unknown> = {};
  const methods = ['from', 'where', 'groupBy', 'orderBy', 'limit', 'innerJoin', 'leftJoin', 'having'];

  // Make it thenable so await resolves it
  chain.then = (resolve: (val: unknown) => void, reject?: (err: unknown) => void) => {
    const idx = selectCallCount++;
    const result = selectResultQueue[idx] ?? [];
    return Promise.resolve(result).then(resolve, reject);
  };

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  // Support prepare for existing prepared statements
  chain.prepare = vi.fn(() => ({ execute: vi.fn().mockResolvedValue([]) }));

  return chain;
}

vi.mock('server-only', () => ({}));
vi.mock('react', () => ({ cache: (fn: (...args: unknown[]) => unknown) => fn }));
vi.mock('@/lib/auth', () => ({ getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args) }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => mockRedirect(url) }));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => createChainableMock()),
    query: {
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      customer: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  customer: { id: 'id', firstName: 'firstName', lastName: 'lastName', email: 'email', createdAt: 'createdAt', userId: 'userId' },
  appointment: { id: 'id', scheduledDate: 'scheduledDate', status: 'status', customerId: 'customerId', type: 'type', duration: 'duration' },
  tattooSession: { id: 'id', status: 'status', totalCost: 'totalCost', appointmentDate: 'appointmentDate', customerId: 'customerId', style: 'style', size: 'size', estimatedHours: 'estimatedHours', consentSigned: 'consentSigned' },
  payment: { id: 'id', type: 'type', status: 'status', amount: 'amount', createdAt: 'createdAt' },
  contact: { id: 'id', createdAt: 'createdAt', status: 'status' },
  settings: { id: 'id', key: 'key', value: 'value', category: 'category' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gte: vi.fn((...args: unknown[]) => args),
  lte: vi.fn((...args: unknown[]) => args),
  lt: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
  asc: vi.fn((col: unknown) => col),
  sql: Object.assign(vi.fn(() => 'sql_expr'), { raw: vi.fn() }),
  not: vi.fn((arg: unknown) => arg),
  inArray: vi.fn(() => []),
  between: vi.fn(() => []),
  count: vi.fn(() => 'count_fn'),
  sum: vi.fn(() => 'sum_fn'),
  avg: vi.fn(() => 'avg_fn'),
  isNull: vi.fn((arg: unknown) => arg),
  or: vi.fn((...args: unknown[]) => args),
}));

vi.mock('date-fns', () => ({
  startOfWeek: vi.fn((date: Date) => date),
  format: vi.fn(() => 'Jan 1'),
  differenceInDays: vi.fn(() => 30),
  eachDayOfInterval: vi.fn(() => {
    // Return Mon-Sat days for capacity calculation
    const days: Date[] = [];
    for (let i = 0; i < 26; i++) {
      const d = new Date(2026, 0, i + 1);
      if (d.getDay() !== 0) days.push(d); // exclude Sundays
    }
    return days;
  }),
}));

const staffSession = { user: { id: 'u1', role: 'admin', email: 'admin@test.com' } };

function setupSelectResults(...results: unknown[][]) {
  selectResultQueue = results;
  selectCallCount = 0;
}

describe('Analytics Depth DAL', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetCurrentSession.mockResolvedValue(staffSession);
    selectResultQueue = [];
    selectCallCount = 0;
    vi.resetModules();
  });

  describe('auth rejection', () => {
    it('redirects to /login when no session for getRevenueByStyle', async () => {
      mockGetCurrentSession.mockResolvedValue(null);
      const { getRevenueByStyle } = await import('@/lib/dal/analytics');
      await expect(getRevenueByStyle(new Date(), new Date())).rejects.toThrow('REDIRECT:/login');
    });

    it('redirects to /login when no session for getBookingFunnel', async () => {
      mockGetCurrentSession.mockResolvedValue(null);
      const { getBookingFunnel } = await import('@/lib/dal/analytics');
      await expect(getBookingFunnel(new Date(), new Date())).rejects.toThrow('REDIRECT:/login');
    });

    it('redirects to /login when no session for getCustomerCLV', async () => {
      mockGetCurrentSession.mockResolvedValue(null);
      const { getCustomerCLV } = await import('@/lib/dal/analytics');
      await expect(getCustomerCLV(new Date(), new Date())).rejects.toThrow('REDIRECT:/login');
    });

    it('redirects to /login when no session for getDurationByType', async () => {
      mockGetCurrentSession.mockResolvedValue(null);
      const { getDurationByType } = await import('@/lib/dal/analytics');
      await expect(getDurationByType(new Date(), new Date())).rejects.toThrow('REDIRECT:/login');
    });
  });

  describe('getRevenueByStyle', () => {
    it('returns grouped revenue data by style', async () => {
      setupSelectResults(
        [{ style: 'Traditional', revenue: 500, count: 3 }, { style: 'Realism', revenue: 800, count: 2 }],
      );
      const { getRevenueByStyle } = await import('@/lib/dal/analytics');
      const result = await getRevenueByStyle(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual([
        { style: 'Traditional', revenue: 500, count: 3 },
        { style: 'Realism', revenue: 800, count: 2 },
      ]);
    });

    it('returns empty array when no data', async () => {
      setupSelectResults([]);
      const { getRevenueByStyle } = await import('@/lib/dal/analytics');
      const result = await getRevenueByStyle(new Date(), new Date());
      expect(result).toEqual([]);
    });
  });

  describe('getRevenueBySize', () => {
    it('returns grouped revenue data by size', async () => {
      setupSelectResults(
        [{ size: 'Large', revenue: 800, count: 2 }, { size: 'Small', revenue: 200, count: 5 }],
      );
      const { getRevenueBySize } = await import('@/lib/dal/analytics');
      const result = await getRevenueBySize(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual([
        { size: 'Large', revenue: 800, count: 2 },
        { size: 'Small', revenue: 200, count: 5 },
      ]);
    });
  });

  describe('getPaymentRates', () => {
    it('returns correct percentage rates', async () => {
      setupSelectResults([{ total: 10, completed: 8, refunded: 1, failed: 1 }]);
      const { getPaymentRates } = await import('@/lib/dal/analytics');
      const result = await getPaymentRates(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual({
        total: 10,
        successRate: 80,
        refundRate: 10,
        failureRate: 10,
      });
    });

    it('returns all zeros when no payments', async () => {
      setupSelectResults([{ total: 0, completed: 0, refunded: 0, failed: 0 }]);
      const { getPaymentRates } = await import('@/lib/dal/analytics');
      const result = await getPaymentRates(new Date(), new Date());

      expect(result).toEqual({
        total: 0,
        successRate: 0,
        refundRate: 0,
        failureRate: 0,
      });
    });
  });

  describe('getAverageTransactionValue', () => {
    it('returns average as number', async () => {
      setupSelectResults([{ avg: 250 }]);
      const { getAverageTransactionValue } = await import('@/lib/dal/analytics');
      const result = await getAverageTransactionValue(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toBe(250);
    });

    it('returns 0 when no transactions', async () => {
      setupSelectResults([{ avg: 0 }]);
      const { getAverageTransactionValue } = await import('@/lib/dal/analytics');
      const result = await getAverageTransactionValue(new Date(), new Date());
      expect(result).toBe(0);
    });
  });

  describe('getBookingFunnel', () => {
    it('returns 3-stage funnel from separate queries', async () => {
      // 3 separate COUNT queries via Promise.all
      setupSelectResults(
        [{ count: 50 }],  // contacts (inquiries)
        [{ count: 30 }],  // appointments
        [{ count: 20 }],  // completed sessions
      );
      const { getBookingFunnel } = await import('@/lib/dal/analytics');
      const result = await getBookingFunnel(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ stage: 'Inquiries', value: 50 });
      expect(result[1]).toMatchObject({ stage: 'Appointments', value: 30 });
      expect(result[2]).toMatchObject({ stage: 'Completed', value: 20 });
      // Each should have a fill color
      expect(result[0].fill).toBeTruthy();
      expect(result[1].fill).toBeTruthy();
      expect(result[2].fill).toBeTruthy();
    });
  });

  describe('getPeakHours', () => {
    it('returns hour-count pairs', async () => {
      setupSelectResults([
        { hour: 10, count: 5 },
        { hour: 14, count: 8 },
      ]);
      const { getPeakHours } = await import('@/lib/dal/analytics');
      const result = await getPeakHours(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual([
        { hour: 10, count: 5 },
        { hour: 14, count: 8 },
      ]);
    });
  });

  describe('getCapacityUtilization', () => {
    it('returns utilization percentage', async () => {
      setupSelectResults(
        [],  // no settings = use defaults (8h/day Mon-Sat)
        [{ bookedHours: 100 }],
      );
      const { getCapacityUtilization } = await import('@/lib/dal/analytics');
      const result = await getCapacityUtilization(new Date('2026-01-01'), new Date('2026-01-31'));

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('getCustomerCLV', () => {
    it('returns customer CLV list sorted by value', async () => {
      setupSelectResults([
        { customerId: '1', firstName: 'John', lastName: 'Doe', clv: 1500, sessions: 5 },
      ]);
      const { getCustomerCLV } = await import('@/lib/dal/analytics');
      const result = await getCustomerCLV(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual([
        { customerId: '1', name: 'John Doe', clv: 1500, sessions: 5 },
      ]);
    });
  });

  describe('getRepeatClientRate', () => {
    it('returns percentage of repeat customers', async () => {
      setupSelectResults([{ repeatCustomers: 3, totalCustomers: 10 }]);
      const { getRepeatClientRate } = await import('@/lib/dal/analytics');
      const result = await getRepeatClientRate(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toBe(30);
    });

    it('returns 0 when no customers', async () => {
      setupSelectResults([{ repeatCustomers: 0, totalCustomers: 0 }]);
      const { getRepeatClientRate } = await import('@/lib/dal/analytics');
      const result = await getRepeatClientRate(new Date(), new Date());
      expect(result).toBe(0);
    });
  });

  describe('getChurnRiskCustomers', () => {
    it('returns customers with no recent activity', async () => {
      setupSelectResults([
        { customerId: '1', firstName: 'Jane', lastName: 'Doe', email: 'j@test.com', lastActivity: null },
      ]);
      const { getChurnRiskCustomers } = await import('@/lib/dal/analytics');
      const result = await getChurnRiskCustomers();

      expect(result).toEqual([
        { customerId: '1', name: 'Jane Doe', email: 'j@test.com', lastActivity: null },
      ]);
    });
  });

  describe('getDurationByType', () => {
    it('returns average duration by tattoo style', async () => {
      setupSelectResults([
        { type: 'Traditional', avgDuration: 2.5, count: 4 },
        { type: 'Realism', avgDuration: 4.0, count: 2 },
      ]);
      const { getDurationByType } = await import('@/lib/dal/analytics');
      const result = await getDurationByType(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual([
        { type: 'Traditional', avgDuration: 2.5, count: 4 },
        { type: 'Realism', avgDuration: 4.0, count: 2 },
      ]);
    });
  });

  describe('getNoShowTrends', () => {
    it('returns monthly no-show trends with rates', async () => {
      setupSelectResults([
        { month: '2026-01', total: 20, noShows: 2 },
        { month: '2026-02', total: 25, noShows: 3 },
      ]);
      const { getNoShowTrends } = await import('@/lib/dal/analytics');
      const result = await getNoShowTrends(new Date('2026-01-01'), new Date('2026-03-31'));

      expect(result).toEqual([
        { month: '2026-01', total: 20, noShows: 2, rate: 10 },
        { month: '2026-02', total: 25, noShows: 3, rate: 12 },
      ]);
    });

    it('handles zero total without division error', async () => {
      setupSelectResults([{ month: '2026-01', total: 0, noShows: 0 }]);
      const { getNoShowTrends } = await import('@/lib/dal/analytics');
      const result = await getNoShowTrends(new Date(), new Date());

      expect(result[0].rate).toBe(0);
    });
  });

  describe('getSchedulingEfficiency', () => {
    it('returns efficiency percentage', async () => {
      setupSelectResults(
        [],  // no settings = use defaults
        [{ bookedHours: 120 }],
      );
      const { getSchedulingEfficiency } = await import('@/lib/dal/analytics');
      const result = await getSchedulingEfficiency(new Date('2026-01-01'), new Date('2026-01-31'));

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('getAnalyticsDepthData aggregator', () => {
    it('is exported as a function', async () => {
      const { getAnalyticsDepthData } = await import('@/lib/dal/analytics');
      expect(typeof getAnalyticsDepthData).toBe('function');
    });
  });

  describe('AnalyticsDepthData interface', () => {
    it('module exports successfully', async () => {
      const analyticsModule = await import('@/lib/dal/analytics');
      expect(analyticsModule).toBeDefined();
    });
  });
});
