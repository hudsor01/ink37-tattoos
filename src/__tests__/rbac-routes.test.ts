import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// RBAC Enforcement Tests at API Route Level
//
// These tests verify that API routes correctly enforce authentication
// and role-based access control through their DAL dependencies.
//
// Architecture:
//   - Admin API routes (/api/admin/*) delegate to DAL which uses requireStaffRole()
//   - Portal routes (/api/portal/*) check getCurrentSession directly
//   - Public routes (/api/store/*, /api/webhooks/*) have no session check
//   - DAL functions throw "Insufficient permissions" for wrong roles
//   - DAL functions call redirect('/login') for unauthenticated
// ---------------------------------------------------------------------------

const ROLES = ['user', 'staff', 'manager', 'admin', 'super_admin'] as const;
type Role = (typeof ROLES)[number];

const STAFF_PLUS: Role[] = ['staff', 'manager', 'admin', 'super_admin'];
const BELOW_STAFF: Role[] = ['user'];

// ---------------------------------------------------------------------------
// Module-scope mocks
// ---------------------------------------------------------------------------
const mockGetCurrentSession = vi.fn();

// DAL mocks -- these simulate role enforcement
const mockGetCustomers = vi.fn();
const mockGetMediaItems = vi.fn();
const mockGetAppointments = vi.fn();
const mockGetSessions = vi.fn();

// DB mocks for portal billing
const mockCustomerFindFirst = vi.fn();

// Stripe billing portal mock
const mockStripeBillingPortalCreate = vi.fn();

// ---------------------------------------------------------------------------
// vi.mock declarations
// ---------------------------------------------------------------------------
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

vi.mock('@/lib/stripe', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockStripeBillingPortalCreate(...args),
      },
    },
  },
  dollarsToStripeCents: (dollars: number) => Math.round(dollars * 100),
}));

vi.mock('@/lib/env', () => ({
  env: () => ({
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-long-xxxxxx',
    BETTER_AUTH_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      customer: { findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args) },
    },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  customer: { userId: 'userId', id: 'id', stripeCustomerId: 'stripeCustomerId' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

// ---------------------------------------------------------------------------
// Helper: create session for a role
// ---------------------------------------------------------------------------
function sessionForRole(role: Role) {
  return {
    user: { id: `user-${role}`, role, email: `${role}@test.com`, name: `Test ${role}` },
  };
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('RBAC Route Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // =========================================================================
  // 1. Admin routes -- DAL enforces staff+ role
  // =========================================================================
  describe('Admin API routes (/api/admin/*)', () => {
    const adminRoutes = [
      {
        name: '/api/admin/customers',
        module: '@/app/api/admin/customers/route',
        dalMock: mockGetCustomers,
        dalName: 'getCustomers',
      },
      {
        name: '/api/admin/media',
        module: '@/app/api/admin/media/route',
        dalMock: mockGetMediaItems,
        dalName: 'getMediaItems',
      },
      {
        name: '/api/admin/appointments',
        module: '@/app/api/admin/appointments/route',
        dalMock: mockGetAppointments,
        dalName: 'getAppointments',
      },
      {
        name: '/api/admin/sessions',
        module: '@/app/api/admin/sessions/route',
        dalMock: mockGetSessions,
        dalName: 'getSessions',
      },
    ];

    describe.each(adminRoutes)('$name', ({ module: mod, dalMock }) => {
      it('returns data when DAL succeeds (staff+ role)', async () => {
        dalMock.mockResolvedValue([{ id: '1' }]);
        const { GET } = await import(mod);
        const response = await GET();
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual([{ id: '1' }]);
      });

      it('returns 401 when DAL throws (insufficient role or unauthenticated)', async () => {
        dalMock.mockRejectedValue(new Error('Insufficient permissions'));
        const { GET } = await import(mod);
        const response = await GET();
        const data = await response.json();
        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });
  });

  // =========================================================================
  // 2. Admin routes rely on DAL for RBAC -- source verification
  // =========================================================================
  describe('Admin route files delegate auth to DAL (no direct session check)', () => {
    const adminRouteFiles = [
      'src/app/api/admin/customers/route.ts',
      'src/app/api/admin/media/route.ts',
      'src/app/api/admin/appointments/route.ts',
      'src/app/api/admin/sessions/route.ts',
    ];

    it.each(adminRouteFiles.map(f => ({ file: f })))(
      '$file delegates to DAL without direct getCurrentSession',
      async ({ file }) => {
        const fs = await import('node:fs');
        const content = fs.readFileSync(file, 'utf-8');

        // Admin routes delegate to DAL -- they do NOT directly call getCurrentSession
        expect(content).not.toContain('getCurrentSession');

        // They import from DAL
        expect(content).toContain('@/lib/dal/');

        // They have try/catch that returns 401 on error
        expect(content).toContain('401');
      },
    );
  });

  // =========================================================================
  // 3. Portal routes -- direct session check, any authenticated user
  // =========================================================================
  describe('Portal API routes (/api/portal/*)', () => {
    describe('/api/portal/billing', () => {
      it('returns 401 when not authenticated', async () => {
        mockGetCurrentSession.mockResolvedValue(null);
        const { POST } = await import('@/app/api/portal/billing/route');
        const response = await POST();
        const data = await response.json();
        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });

      it.each(ROLES.map(r => ({ role: r })))(
        'accepts $role when customer has stripeCustomerId',
        async ({ role }) => {
          vi.clearAllMocks();
          mockGetCurrentSession.mockResolvedValue(sessionForRole(role));
          mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1', stripeCustomerId: 'cus_stripe_1' });
          mockStripeBillingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.test' });

          const { POST } = await import('@/app/api/portal/billing/route');
          const response = await POST();
          const data = await response.json();
          expect(response.status).toBe(200);
          expect(data.url).toBe('https://billing.stripe.test');
        },
      );

      it('returns 404 when no customer record linked', async () => {
        mockGetCurrentSession.mockResolvedValue(sessionForRole('user'));
        mockCustomerFindFirst.mockResolvedValue(null);

        const { POST } = await import('@/app/api/portal/billing/route');
        const response = await POST();
        const data = await response.json();
        expect(response.status).toBe(404);
        expect(data.error).toContain('No customer record');
      });

      it('returns 404 when customer has no stripeCustomerId', async () => {
        mockGetCurrentSession.mockResolvedValue(sessionForRole('user'));
        mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1', stripeCustomerId: null });

        const { POST } = await import('@/app/api/portal/billing/route');
        const response = await POST();
        const data = await response.json();
        expect(response.status).toBe(404);
        expect(data.error).toContain('No Stripe customer');
      });
    });
  });

  // =========================================================================
  // 4. Portal route source verification -- uses getCurrentSession directly
  // =========================================================================
  describe('Portal route files check getCurrentSession directly', () => {
    it('/api/portal/billing/route.ts uses getCurrentSession', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync('src/app/api/portal/billing/route.ts', 'utf-8');
      expect(content).toContain('getCurrentSession');
      expect(content).toContain('401');
    });
  });

  // =========================================================================
  // 5. Public routes -- no session check
  // =========================================================================
  describe('Public API routes (no auth required)', () => {
    it('/api/store/download/route.ts does NOT use getCurrentSession (token-based)', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync('src/app/api/store/download/route.ts', 'utf-8');
      // Download route uses token-based auth, not session
      expect(content).not.toContain('getCurrentSession');
      expect(content).toContain('token');
    });

    it('webhook routes do NOT use getCurrentSession (signature-based)', async () => {
      const fs = await import('node:fs');
      const webhookFiles = [
        'src/app/api/webhooks/stripe/route.ts',
        'src/app/api/webhooks/cal/route.ts',
        'src/app/api/webhooks/resend/route.ts',
      ];

      for (const file of webhookFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content, `${file} should NOT use getCurrentSession`).not.toContain('getCurrentSession');
      }
    });
  });

  // =========================================================================
  // 6. DAL role enforcement patterns across all modules
  // =========================================================================
  describe('DAL role enforcement patterns', () => {
    it('all staff-protected DAL files use consistent requireStaffRole pattern', async () => {
      const fs = await import('node:fs');
      const staffDals = [
        'src/lib/dal/customers.ts',
        'src/lib/dal/appointments.ts',
        'src/lib/dal/sessions.ts',
        'src/lib/dal/media.ts',
        'src/lib/dal/products.ts',
      ];

      for (const file of staffDals) {
        const content = fs.readFileSync(file, 'utf-8');

        // Pattern: redirect for unauthenticated, throw for wrong role
        expect(content, `${file} must redirect unauthenticated users`).toContain("redirect('/login')");
        expect(content, `${file} must throw for insufficient role`).toContain('Insufficient permissions');
      }
    });

    it('admin-protected DAL files use requireAdminRole pattern', async () => {
      const fs = await import('node:fs');
      const adminDals = [
        'src/lib/dal/settings.ts',
        'src/lib/dal/users.ts',
      ];

      for (const file of adminDals) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content, `${file} must have requireAdminRole`).toContain('requireAdminRole');
        expect(content, `${file} must redirect unauthenticated users`).toContain("redirect('/login')");
        expect(content, `${file} must throw for insufficient role`).toContain('Insufficient permissions');
      }
    });
  });

  // =========================================================================
  // 7. Upload routes -- have their own auth pattern
  // =========================================================================
  describe('Upload routes', () => {
    it('/api/upload route files exist and verify authentication', async () => {
      const fs = await import('node:fs');

      const uploadRoute = fs.readFileSync('src/app/api/upload/route.ts', 'utf-8');
      // Upload routes should check authentication
      expect(uploadRoute).toContain('getCurrentSession');
    });
  });

  // =========================================================================
  // 8. Role enforcement consistency matrix
  //    Verifies every route category enforces the correct RBAC level
  // =========================================================================
  describe('Route RBAC level matrix', () => {
    const routeMatrix = [
      { category: 'Admin CRUD', example: '/api/admin/customers', level: 'staff+', enforcer: 'DAL requireStaffRole' },
      { category: 'Admin CRUD', example: '/api/admin/media', level: 'staff+', enforcer: 'DAL requireStaffRole' },
      { category: 'Admin CRUD', example: '/api/admin/appointments', level: 'staff+', enforcer: 'DAL requireStaffRole' },
      { category: 'Admin CRUD', example: '/api/admin/sessions', level: 'staff+', enforcer: 'DAL requireStaffRole' },
      { category: 'Portal', example: '/api/portal/billing', level: 'any-authenticated', enforcer: 'Direct getCurrentSession' },
      { category: 'Upload', example: '/api/upload', level: 'any-authenticated', enforcer: 'Direct getCurrentSession' },
      { category: 'Public', example: '/api/store/download', level: 'none (token-based)', enforcer: 'Token validation' },
      { category: 'Webhook', example: '/api/webhooks/stripe', level: 'none (signature-based)', enforcer: 'Stripe signature' },
    ];

    it.each(routeMatrix)(
      '$example requires $level ($enforcer)',
      async ({ example, level }) => {
        // This is a documentation test -- verifies the matrix is accurate
        // by checking source files
        const fs = await import('node:fs');
        const routePath = example.replace('/api/', 'src/app/api/') + '/route.ts';
        const content = fs.readFileSync(routePath, 'utf-8');

        if (level === 'staff+') {
          // Should delegate to DAL (no direct getCurrentSession)
          expect(content).not.toContain('getCurrentSession');
          expect(content).toContain('@/lib/dal/');
        } else if (level === 'any-authenticated') {
          expect(content).toContain('getCurrentSession');
        } else if (level.startsWith('none')) {
          expect(content).not.toContain('getCurrentSession');
        }
      },
    );
  });
});
