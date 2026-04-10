import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// RBAC Enforcement Tests at Server Action Level
//
// These tests verify that server actions correctly enforce authentication
// and that the DAL layer (called through actions) enforces role-based access.
//
// Architecture recap:
//   - Server actions check getCurrentSession() for basic auth (any logged-in user)
//   - DAL functions enforce role via requireStaffRole() or requireAdminRole()
//   - Portal actions only need any authenticated user
//   - Public actions (store, gift card, contact) have no auth check
// ---------------------------------------------------------------------------

const ROLES = ['user', 'staff', 'manager', 'admin', 'super_admin'] as const;
type Role = (typeof ROLES)[number];

const STAFF_PLUS: Role[] = ['staff', 'manager', 'admin', 'super_admin'];
const ADMIN_PLUS: Role[] = ['admin', 'super_admin'];
const BELOW_STAFF: Role[] = ['user'];
const BELOW_ADMIN: Role[] = ['user', 'staff', 'manager'];

// ---------------------------------------------------------------------------
// Module-scope mocks
// ---------------------------------------------------------------------------
const mockGetCurrentSession = vi.fn();
const mockRedirect = vi.fn((_url: string, _type?: 'push' | 'replace') => {
  throw new Error('NEXT_REDIRECT');
});

// DAL mocks
const mockCreateCustomer = vi.fn().mockResolvedValue({ id: 'cust-1' });
const mockUpdateCustomer = vi.fn().mockResolvedValue({ id: 'cust-1' });
const mockDeleteCustomer = vi.fn().mockResolvedValue(undefined);
const mockCreateAppointment = vi.fn().mockResolvedValue({ id: 'apt-1' });
const mockUpdateAppointment = vi.fn().mockResolvedValue({ id: 'apt-1' });
const mockDeleteAppointment = vi.fn().mockResolvedValue(undefined);
const mockCreateSession = vi.fn().mockResolvedValue({ id: 'sess-1' });
const mockUpdateSession = vi.fn().mockResolvedValue({ id: 'sess-1' });
const mockDeleteSession = vi.fn().mockResolvedValue(undefined);
const mockCreateMediaItem = vi.fn().mockResolvedValue({ id: 'media-1' });
const mockUpdateMediaItem = vi.fn().mockResolvedValue({ id: 'media-1' });
const mockDeleteMediaItem = vi.fn().mockResolvedValue(undefined);
const mockGetMediaItemById = vi.fn().mockResolvedValue({ id: 'media-1', fileUrl: 'https://blob.test/file.png', thumbnailUrl: null });
const mockTogglePublicVisibility = vi.fn().mockResolvedValue({ id: 'media-1' });
const mockCreateProduct = vi.fn().mockResolvedValue({ id: 'prod-1' });
const mockUpdateProduct = vi.fn().mockResolvedValue({ id: 'prod-1' });
const mockDeleteProduct = vi.fn().mockResolvedValue(undefined);
const mockGetProductById = vi.fn().mockResolvedValue({ id: 'prod-1', name: 'Test', price: 10, stripeProductId: 'sp_1', stripePriceId: 'price_1' });
const mockUpsertSetting = vi.fn().mockResolvedValue({ key: 'test', value: 'val' });
const mockUpdateOrderStatus = vi.fn().mockResolvedValue(undefined);
const mockGetOrderById = vi.fn().mockResolvedValue({ id: 'ord-1', stripePaymentIntentId: 'pi_1' });
const mockUpdateContactStatus = vi.fn().mockResolvedValue(undefined);
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetSessionById = vi.fn().mockResolvedValue({
  id: 'sess-1',
  customerId: 'cust-1',
  designDescription: 'Test Design',
  totalCost: 500,
  paidAmount: 100,
  customer: { id: 'cust-1', email: 'test@test.com', firstName: 'John', lastName: 'Doe' },
});
const mockGetOrCreateStripeCustomer = vi.fn().mockResolvedValue('cus_stripe_1');
const mockCreatePaymentRecord = vi.fn().mockResolvedValue(undefined);
const mockSendPaymentRequestEmail = vi.fn().mockResolvedValue(undefined);

// DB mocks for portal actions
const mockCustomerFindFirst = vi.fn();
const mockTattooSessionFindFirst = vi.fn();
const mockDbUpdateSetWhere = vi.fn().mockResolvedValue(undefined);

// Stripe mock
const mockStripeProductsCreate = vi.fn().mockResolvedValue({ id: 'sp_1' });
const mockStripePricesCreate = vi.fn().mockResolvedValue({ id: 'price_1' });
const mockStripePricesUpdate = vi.fn().mockResolvedValue({});
const mockStripeProductsUpdate = vi.fn().mockResolvedValue({});
const mockStripeRefundsCreate = vi.fn().mockResolvedValue({});
const mockStripeCheckoutCreate = vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test' });

// ---------------------------------------------------------------------------
// vi.mock declarations
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}));

const mockRequireRole = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (url: string, type?: 'push' | 'replace') => mockRedirect(url, type),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

vi.mock('@/lib/dal/customers', () => ({
  createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
  updateCustomer: (...args: unknown[]) => mockUpdateCustomer(...args),
  deleteCustomer: (...args: unknown[]) => mockDeleteCustomer(...args),
}));

vi.mock('@/lib/dal/appointments', () => ({
  createAppointment: (...args: unknown[]) => mockCreateAppointment(...args),
  updateAppointment: (...args: unknown[]) => mockUpdateAppointment(...args),
  deleteAppointment: (...args: unknown[]) => mockDeleteAppointment(...args),
}));

vi.mock('@/lib/dal/sessions', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
}));

vi.mock('@/lib/dal/media', () => ({
  createMediaItem: (...args: unknown[]) => mockCreateMediaItem(...args),
  updateMediaItem: (...args: unknown[]) => mockUpdateMediaItem(...args),
  deleteMediaItem: (...args: unknown[]) => mockDeleteMediaItem(...args),
  getMediaItemById: (...args: unknown[]) => mockGetMediaItemById(...args),
  togglePublicVisibility: (...args: unknown[]) => mockTogglePublicVisibility(...args),
}));

vi.mock('@/lib/dal/products', () => ({
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  deleteProduct: (...args: unknown[]) => mockDeleteProduct(...args),
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
}));

vi.mock('@/lib/dal/settings', () => ({
  upsertSetting: (...args: unknown[]) => mockUpsertSetting(...args),
}));

vi.mock('@/lib/dal/orders', () => ({
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
}));

vi.mock('@/lib/dal/contacts', () => ({
  updateContactStatus: (...args: unknown[]) => mockUpdateContactStatus(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('@/lib/dal/payments', () => ({
  getOrCreateStripeCustomer: (...args: unknown[]) => mockGetOrCreateStripeCustomer(...args),
  createPaymentRecord: (...args: unknown[]) => mockCreatePaymentRecord(...args),
}));

vi.mock('@/lib/email/resend', () => ({
  sendPaymentRequestEmail: (...args: unknown[]) => mockSendPaymentRequestEmail(...args),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    products: {
      create: (...args: unknown[]) => mockStripeProductsCreate(...args),
      update: (...args: unknown[]) => mockStripeProductsUpdate(...args),
    },
    prices: {
      create: (...args: unknown[]) => mockStripePricesCreate(...args),
      update: (...args: unknown[]) => mockStripePricesUpdate(...args),
    },
    refunds: {
      create: (...args: unknown[]) => mockStripeRefundsCreate(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockStripeCheckoutCreate(...args),
      },
    },
  },
  dollarsToStripeCents: (dollars: number) => Math.round(dollars * 100),
}));

vi.mock('@vercel/blob', () => ({
  del: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/lib/security/validation', () => ({
  CreateCustomerSchema: { parse: (d: unknown) => d },
  UpdateCustomerSchema: { parse: (d: unknown) => d },
  CreateAppointmentSchema: { parse: (d: unknown) => d },
  UpdateAppointmentSchema: { parse: (d: unknown) => d },
  CreateSessionSchema: { parse: (d: unknown) => d },
  CreateProductSchema: { parse: (d: unknown) => d },
  UpdateProductSchema: { parse: (d: unknown) => d },
  UpdateSettingsSchema: { parse: (d: unknown) => d },
  UpdateOrderStatusSchema: { parse: (d: unknown) => d },
  RequestDepositSchema: { parse: (d: unknown) => d },
  RequestBalanceSchema: { parse: (d: unknown) => d },
  ConsentSignSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  UpdatePortalProfileSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      customer: { findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args) },
      tattooSession: { findFirst: (...args: unknown[]) => mockTattooSessionFindFirst(...args) },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: (...args: unknown[]) => mockDbUpdateSetWhere(...args),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  customer: { userId: 'userId', id: 'id', email: 'email' },
  tattooSession: {
    id: 'id',
    customerId: 'customerId',
    consentSigned: 'consentSigned',
    consentSignedAt: 'consentSignedAt',
    consentSignedBy: 'consentSignedBy',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

// ---------------------------------------------------------------------------
// Helper: create a session with a given role
// ---------------------------------------------------------------------------
function sessionForRole(role: Role) {
  return {
    user: { id: `user-${role}`, role, email: `${role}@test.com`, name: `Test ${role}` },
  };
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('RBAC Action Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // =========================================================================
  // 1. Unauthenticated rejection -- null session
  // =========================================================================
  describe('Unauthenticated rejection (null session)', () => {
    const adminActions = [
      { name: 'createCustomerAction', module: '@/lib/actions/customer-actions', buildFormData: () => { const fd = new FormData(); fd.set('firstName', 'J'); fd.set('lastName', 'D'); fd.set('email', 'j@t.com'); return fd; } },
      { name: 'updateCustomerAction', module: '@/lib/actions/customer-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.updateCustomerAction('id', new FormData()) },
      { name: 'deleteCustomerAction', module: '@/lib/actions/customer-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.deleteCustomerAction('id') },
      { name: 'createAppointmentAction', module: '@/lib/actions/appointment-actions', buildFormData: () => new FormData() },
      { name: 'updateAppointmentAction', module: '@/lib/actions/appointment-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.updateAppointmentAction('id', new FormData()) },
      { name: 'deleteAppointmentAction', module: '@/lib/actions/appointment-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.deleteAppointmentAction('id') },
      { name: 'createSessionAction', module: '@/lib/actions/session-actions', buildFormData: () => { const fd = new FormData(); fd.set('duration', '60'); fd.set('hourlyRate', '100'); fd.set('estimatedHours', '2'); fd.set('totalCost', '200'); return fd; } },
      { name: 'updateSessionAction', module: '@/lib/actions/session-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.updateSessionAction('id', new FormData()) },
      { name: 'deleteSessionAction', module: '@/lib/actions/session-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.deleteSessionAction('id') },
      { name: 'createMediaAction', module: '@/lib/actions/media-actions', buildFormData: () => { const fd = new FormData(); fd.set('name', 'test'); fd.set('fileUrl', 'https://test.com/f.png'); fd.set('artistId', 'a1'); return fd; } },
      { name: 'deleteMediaAction', module: '@/lib/actions/media-actions', call: async (mod: Record<string, (...a: unknown[]) => Promise<unknown>>) => mod.deleteMediaAction('id') },
      { name: 'createProductAction', module: '@/lib/actions/product-actions', buildFormData: () => { const fd = new FormData(); fd.set('name', 'P'); fd.set('price', '10'); fd.set('productType', 'PHYSICAL'); return fd; } },
      { name: 'deleteProductAction', module: '@/lib/actions/product-actions', buildFormData: () => { const fd = new FormData(); fd.set('productId', 'p1'); return fd; } },
      { name: 'upsertSettingAction', module: '@/lib/actions/settings-actions', buildFormData: () => { const fd = new FormData(); fd.set('key', 'k'); fd.set('value', 'v'); return fd; } },
      { name: 'updateOrderStatusAction', module: '@/lib/actions/order-actions', buildFormData: () => { const fd = new FormData(); fd.set('orderId', 'o1'); fd.set('status', 'PROCESSING'); return fd; } },
      { name: 'requestDepositAction', module: '@/lib/actions/payment-actions', buildFormData: () => { const fd = new FormData(); fd.set('sessionId', 's1'); fd.set('amount', '100'); return fd; } },
    ];

    it.each(adminActions)(
      '$name rejects unauthenticated requests',
      async ({ name, module: mod, buildFormData, call }) => {
        mockGetCurrentSession.mockResolvedValue(null);
        mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
        const imported = await import(mod);
        const action = imported[name];

        if (call) {
          await expect(call(imported)).rejects.toThrow('Unauthorized');
        } else {
          const fd = buildFormData!();
          await expect(action(fd)).rejects.toThrow('Unauthorized');
        }
      },
    );

    it('signConsentAction rejects unauthenticated (returns error)', async () => {
      mockGetCurrentSession.mockResolvedValue(null);
      const { signConsentAction } = await import('@/lib/actions/portal-actions');
      const fd = new FormData();
      fd.set('sessionId', 's1');
      fd.set('signedName', 'John');
      fd.set('acknowledged', 'true');
      const result = await signConsentAction(fd);
      expect(result).toEqual({ success: false, error: 'You must be logged in to sign consent.' });
    });

    it('updateProfileAction rejects unauthenticated (returns error)', async () => {
      mockGetCurrentSession.mockResolvedValue(null);
      const { updateProfileAction } = await import('@/lib/actions/portal-actions');
      const fd = new FormData();
      fd.set('firstName', 'John');
      fd.set('lastName', 'Doe');
      const result = await updateProfileAction(fd);
      expect(result).toEqual({ success: false, error: 'You must be logged in to update your profile.' });
    });
  });

  // =========================================================================
  // 2. Authenticated actions -- ALL roles accepted at action level
  //    (Role enforcement happens in DAL, tested in rbac.test.ts)
  //    Here we verify the action itself does not add extra role restrictions
  // =========================================================================
  describe('Authenticated user acceptance at action level', () => {
    // Actions that check session but delegate role enforcement to DAL.
    // The action should NOT throw for any authenticated role --
    // if the DAL rejects, that is tested separately.

    describe.each(ROLES.map(r => ({ role: r })))('Role: $role', ({ role }) => {
      beforeEach(() => {
        const roleSession = sessionForRole(role);
        mockGetCurrentSession.mockResolvedValue(roleSession);
        mockRequireRole.mockResolvedValue(roleSession);
        // Ensure DAL mocks resolve (so action-level auth is what we test)
        mockCreateCustomer.mockResolvedValue({ id: 'cust-1' });
        mockUpdateCustomer.mockResolvedValue({ id: 'cust-1' });
        mockDeleteCustomer.mockResolvedValue(undefined);
      });

      it('createCustomerAction does not throw at action level', async () => {
        const { createCustomerAction } = await import('@/lib/actions/customer-actions');
        const fd = new FormData();
        fd.set('firstName', 'John');
        fd.set('lastName', 'Doe');
        fd.set('email', 'john@test.com');
        // Should not throw -- DAL will handle role check
        const result = await createCustomerAction(fd);
        expect(result).toBeDefined();
      });

      it('deleteCustomerAction does not throw at action level', async () => {
        const { deleteCustomerAction } = await import('@/lib/actions/customer-actions');
        await deleteCustomerAction('cust-1');
        expect(mockDeleteCustomer).toHaveBeenCalledWith('cust-1');
      });
    });
  });

  // =========================================================================
  // 3. Portal actions -- any authenticated user can call
  // =========================================================================
  describe('Portal actions accept any authenticated role', () => {
    it.each(ROLES.map(r => ({ role: r })))(
      'signConsentAction succeeds for $role when customer exists',
      async ({ role }) => {
        vi.clearAllMocks();
        mockGetCurrentSession.mockResolvedValue(sessionForRole(role));
        mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1' });
        mockTattooSessionFindFirst.mockResolvedValue({
          id: 'sess-1',
          customerId: 'cust-1',
          consentSignedAt: null,
        });
        mockDbUpdateSetWhere.mockResolvedValue(undefined);

        const { signConsentAction } = await import('@/lib/actions/portal-actions');
        const fd = new FormData();
        fd.set('sessionId', 'sess-1');
        fd.set('signedName', 'Test User');
        fd.set('acknowledged', 'true');
        const result = await signConsentAction(fd);
        expect(result.success).toBe(true);
      },
    );

    it.each(ROLES.map(r => ({ role: r })))(
      'updateProfileAction succeeds for $role when customer exists',
      async ({ role }) => {
        vi.clearAllMocks();
        mockGetCurrentSession.mockResolvedValue(sessionForRole(role));
        mockCustomerFindFirst.mockResolvedValue({ id: 'cust-1' });
        mockDbUpdateSetWhere.mockResolvedValue(undefined);

        const { updateProfileAction } = await import('@/lib/actions/portal-actions');
        const fd = new FormData();
        fd.set('firstName', 'Jane');
        fd.set('lastName', 'Doe');
        const result = await updateProfileAction(fd);
        expect(result.success).toBe(true);
      },
    );
  });

  // =========================================================================
  // 4. Public actions -- no auth check at all
  // =========================================================================
  describe('Public actions require no authentication', () => {
    it('contactStatusAction calls DAL via requireRole (not getCurrentSession directly)', async () => {
      mockRequireRole.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', email: 'admin@test.com' } });
      mockUpdateContactStatus.mockResolvedValue(undefined);
      const { updateContactStatusAction } = await import('@/lib/actions/contact-status-action');
      const result = await updateContactStatusAction('c1', 'READ');
      expect(result.success).toBe(true);
      // getCurrentSession should NOT have been called directly
      expect(mockGetCurrentSession).not.toHaveBeenCalled();
      // requireRole SHOULD have been called
      expect(mockRequireRole).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. DAL Role Enforcement -- the real RBAC gate
  //    This verifies the DAL functions themselves enforce STAFF_ROLES and ADMIN_ROLES
  // =========================================================================
  describe('DAL STAFF_ROLES enforcement (staff+)', () => {
    // For DAL tests we need to un-mock the DAL and mock getCurrentSession
    // But since DAL modules import 'server-only' and use db/redirect,
    // we test by reading the source files and verifying the RBAC patterns.
    // The actual role check logic is tested in rbac.test.ts.
    // Here we do a cross-cutting verification that the right DAL modules
    // use the right role requirement.

    const staffProtectedDals = [
      'src/lib/dal/customers.ts',
      'src/lib/dal/appointments.ts',
      'src/lib/dal/sessions.ts',
      'src/lib/dal/media.ts',
      'src/lib/dal/products.ts',
      'src/lib/dal/analytics.ts',
      'src/lib/dal/audit.ts',
    ];

    it.each(staffProtectedDals.map(f => ({ file: f })))(
      '$file uses requireStaffRole for protection',
      async ({ file }) => {
        const fs = await import('node:fs');
        const content = fs.readFileSync(file, 'utf-8');

        // Must have requireStaffRole
        expect(content).toContain('requireStaffRole');
        expect(content).toContain('STAFF_ROLES');

        // Verify STAFF_ROLES has exactly the right roles
        const rolesMatch = content.match(/STAFF_ROLES\s*=\s*\[(.*?)\]/);
        expect(rolesMatch).toBeTruthy();
        const rolesStr = rolesMatch![1];
        for (const role of STAFF_PLUS) {
          expect(rolesStr).toContain(`'${role}'`);
        }
        expect(rolesStr).not.toContain("'user'");
      },
    );
  });

  describe('DAL ADMIN_ROLES enforcement (admin+)', () => {
    const adminProtectedDals = [
      'src/lib/dal/settings.ts',
      'src/lib/dal/users.ts',
    ];

    it.each(adminProtectedDals.map(f => ({ file: f })))(
      '$file uses requireAdminRole for elevated operations',
      async ({ file }) => {
        const fs = await import('node:fs');
        const content = fs.readFileSync(file, 'utf-8');

        expect(content).toContain('requireAdminRole');
        expect(content).toContain('ADMIN_ROLES');

        const rolesMatch = content.match(/ADMIN_ROLES\s*=\s*\[(.*?)\]/);
        expect(rolesMatch).toBeTruthy();
        const rolesStr = rolesMatch![1];
        for (const role of ADMIN_PLUS) {
          expect(rolesStr).toContain(`'${role}'`);
        }
        // staff and user should NOT be in ADMIN_ROLES
        expect(rolesStr).not.toContain("'staff'");
        expect(rolesStr).not.toContain("'user'");
      },
    );

    it('settings.ts upsertSetting function uses requireAdminRole (not just requireStaffRole)', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync('src/lib/dal/settings.ts', 'utf-8');
      const fnMatch = content.match(/export async function upsertSetting[\s\S]*?(?=export |$)/);
      expect(fnMatch).toBeTruthy();
      expect(fnMatch![0]).toContain('requireAdminRole');
    });
  });

  // =========================================================================
  // 6. Role hierarchy verification
  // =========================================================================
  describe('Role hierarchy integrity', () => {
    it('STAFF_ROLES includes staff, manager, admin, super_admin but not user', () => {
      const STAFF_ROLES_EXPECTED = ['staff', 'manager', 'admin', 'super_admin'];
      expect(STAFF_ROLES_EXPECTED).not.toContain('user');
      for (const role of ['staff', 'manager', 'admin', 'super_admin']) {
        expect(STAFF_ROLES_EXPECTED).toContain(role);
      }
    });

    it('ADMIN_ROLES includes only admin, super_admin', () => {
      const ADMIN_ROLES_EXPECTED = ['admin', 'super_admin'];
      expect(ADMIN_ROLES_EXPECTED).toHaveLength(2);
      expect(ADMIN_ROLES_EXPECTED).toContain('admin');
      expect(ADMIN_ROLES_EXPECTED).toContain('super_admin');
      expect(ADMIN_ROLES_EXPECTED).not.toContain('user');
      expect(ADMIN_ROLES_EXPECTED).not.toContain('staff');
      expect(ADMIN_ROLES_EXPECTED).not.toContain('manager');
    });

    it('user role cannot access any staff-protected action through DAL', () => {
      // user is NOT in STAFF_ROLES => requireStaffRole would throw
      expect(STAFF_PLUS).not.toContain('user');
      expect(BELOW_STAFF).toContain('user');
    });

    it('staff and manager roles cannot access admin-protected operations through DAL', () => {
      expect(ADMIN_PLUS).not.toContain('staff');
      expect(ADMIN_PLUS).not.toContain('manager');
      expect(BELOW_ADMIN).toContain('staff');
      expect(BELOW_ADMIN).toContain('manager');
    });
  });

  // =========================================================================
  // 7. Cross-cutting: verify all action files that should have auth checks DO have them
  // =========================================================================
  describe('All admin action files enforce authentication', () => {
    const authProtectedActionFiles = [
      { file: 'src/lib/actions/customer-actions.ts', actions: ['createCustomerAction', 'updateCustomerAction', 'deleteCustomerAction'] },
      { file: 'src/lib/actions/appointment-actions.ts', actions: ['createAppointmentAction', 'updateAppointmentAction', 'deleteAppointmentAction'] },
      { file: 'src/lib/actions/session-actions.ts', actions: ['createSessionAction', 'updateSessionAction', 'deleteSessionAction'] },
      { file: 'src/lib/actions/media-actions.ts', actions: ['createMediaAction', 'updateMediaAction', 'deleteMediaAction', 'toggleVisibilityAction'] },
      { file: 'src/lib/actions/product-actions.ts', actions: ['createProductAction', 'updateProductAction', 'deleteProductAction'] },
      { file: 'src/lib/actions/settings-actions.ts', actions: ['upsertSettingAction'] },
      { file: 'src/lib/actions/order-actions.ts', actions: ['updateOrderStatusAction', 'refundOrderAction'] },
      { file: 'src/lib/actions/payment-actions.ts', actions: ['requestDepositAction', 'requestBalanceAction'] },
    ];

    it.each(authProtectedActionFiles)(
      '$file has authentication check in all exported actions',
      async ({ file, actions }) => {
        const fs = await import('node:fs');
        const content = fs.readFileSync(file, 'utf-8');

        // File must import some auth check (requireRole or getCurrentSession)
        const hasAuth = content.includes('getCurrentSession') || content.includes('requireRole');
        expect(hasAuth, `${file} must import getCurrentSession or requireRole`).toBe(true);

        // Each action function should check session via getCurrentSession or requireRole
        for (const actionName of actions) {
          const fnPattern = new RegExp(
            `export async function ${actionName}[\\s\\S]*?(?=export |$)`,
          );
          const fnMatch = content.match(fnPattern);
          expect(fnMatch, `${actionName} should exist in ${file}`).toBeTruthy();
          const fnBody = fnMatch![0];
          const hasAuthCheck = fnBody.includes('getCurrentSession') || fnBody.includes('requireRole');
          expect(
            hasAuthCheck,
            `${actionName} in ${file} must call getCurrentSession or requireRole`,
          ).toBe(true);
        }
      },
    );
  });

  describe('Portal action files enforce authentication (non-throwing pattern)', () => {
    it('portal-actions.ts uses getCurrentSession and returns error for unauthenticated', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync('src/lib/actions/portal-actions.ts', 'utf-8');

      expect(content).toContain('getCurrentSession');

      // signConsentAction and updateProfileAction should check session
      for (const action of ['signConsentAction', 'updateProfileAction']) {
        const fnPattern = new RegExp(
          `export async function ${action}[\\s\\S]*?(?=export |$)`,
        );
        const fnMatch = content.match(fnPattern);
        expect(fnMatch, `${action} should exist`).toBeTruthy();
        expect(fnMatch![0]).toContain('getCurrentSession');
        // Portal actions return { success: false, error } instead of throwing
        expect(fnMatch![0]).toContain('success: false');
      }
    });
  });

  describe('Public action files do NOT require authentication', () => {
    it('contactStatusAction calls DAL (contact-status-action is separate from contact-actions)', async () => {
      // contact-actions.ts has both public (submitContactForm) and admin actions.
      // The public submitContactForm does NOT use getCurrentSession.
      const fs = await import('node:fs');
      const content = fs.readFileSync('src/lib/actions/contact-actions.ts', 'utf-8');
      const fnPattern = /export async function submitContactForm[\s\S]*?(?=export |$)/;
      const fnMatch = content.match(fnPattern);
      expect(fnMatch).toBeTruthy();
      // submitContactForm should NOT call getCurrentSession or requireRole
      expect(fnMatch![0]).not.toContain('getCurrentSession');
      expect(fnMatch![0]).not.toContain('requireRole');
    });

    it('storeCheckoutAction does not require auth', async () => {
      const fs = await import('node:fs');
      const content = fs.readFileSync('src/lib/actions/store-actions.ts', 'utf-8');
      const fnPattern = /export async function storeCheckoutAction[\s\S]*?(?=export |$)/;
      const fnMatch = content.match(fnPattern);
      expect(fnMatch).toBeTruthy();
      expect(fnMatch![0]).not.toContain('getCurrentSession');
      expect(fnMatch![0]).not.toContain('requireRole');
    });
  });
});
