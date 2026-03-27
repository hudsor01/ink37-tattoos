import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const {
  mockGetCurrentSession,
  mockCreateCustomer,
  mockUpdateCustomer,
  mockDeleteCustomer,
  mockLogAudit,
  mockRevalidatePath,
  mockCustomerFindFirst,
  mockTattooSessionFindFirst,
  mockDbUpdateSetWhere,
} = vi.hoisted(() => ({
  mockGetCurrentSession: vi.fn(),
  mockCreateCustomer: vi.fn(),
  mockUpdateCustomer: vi.fn(),
  mockDeleteCustomer: vi.fn(),
  mockLogAudit: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockCustomerFindFirst: vi.fn(),
  mockTattooSessionFindFirst: vi.fn(),
  mockDbUpdateSetWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: mockGetCurrentSession,
}));

vi.mock('@/lib/dal/customers', () => ({
  createCustomer: mockCreateCustomer,
  updateCustomer: mockUpdateCustomer,
  deleteCustomer: mockDeleteCustomer,
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: mockLogAudit,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      customer: { findFirst: mockCustomerFindFirst },
      tattooSession: { findFirst: mockTattooSessionFindFirst },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: mockDbUpdateSetWhere,
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  customer: { userId: 'userId', id: 'id', email: 'email' },
  tattooSession: { id: 'id', customerId: 'customerId', consentSigned: 'consentSigned', consentSignedAt: 'consentSignedAt', consentSignedBy: 'consentSignedBy' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

const staffSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };
const TEST_SESSION_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('Customer Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('createCustomerAction throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { createCustomerAction } = await import('@/lib/actions/customer-actions');
    const formData = new FormData();
    formData.set('firstName', 'John');
    formData.set('lastName', 'Doe');
    formData.set('email', 'john@test.com');
    await expect(createCustomerAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('createCustomerAction calls createCustomer with validated data', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCreateCustomer.mockResolvedValue({ id: 'cust-1' });
    const { createCustomerAction } = await import('@/lib/actions/customer-actions');
    const formData = new FormData();
    formData.set('firstName', 'John');
    formData.set('lastName', 'Doe');
    formData.set('email', 'john@test.com');
    await createCustomerAction(formData);
    expect(mockCreateCustomer).toHaveBeenCalledTimes(1);
    expect(mockCreateCustomer.mock.calls[0][0]).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    });
  });

  it('createCustomerAction calls revalidatePath', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCreateCustomer.mockResolvedValue({ id: 'cust-1' });
    const { createCustomerAction } = await import('@/lib/actions/customer-actions');
    const formData = new FormData();
    formData.set('firstName', 'John');
    formData.set('lastName', 'Doe');
    formData.set('email', 'john@test.com');
    await createCustomerAction(formData);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/customers');
  });

  it('updateCustomerAction throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateCustomerAction } = await import('@/lib/actions/customer-actions');
    const formData = new FormData();
    formData.set('firstName', 'Jane');
    await expect(updateCustomerAction('cust-1', formData)).rejects.toThrow('Unauthorized');
  });

  it('updateCustomerAction calls updateCustomer and revalidatePath', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockUpdateCustomer.mockResolvedValue({ id: 'cust-1' });
    const { updateCustomerAction } = await import('@/lib/actions/customer-actions');
    const formData = new FormData();
    formData.set('firstName', 'Jane');
    formData.set('lastName', 'Smith');
    await updateCustomerAction('cust-1', formData);
    expect(mockUpdateCustomer).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/customers');
  });

  it('deleteCustomerAction throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { deleteCustomerAction } = await import('@/lib/actions/customer-actions');
    await expect(deleteCustomerAction('cust-1')).rejects.toThrow('Unauthorized');
  });

  it('deleteCustomerAction calls deleteCustomer and revalidatePath', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockDeleteCustomer.mockResolvedValue(undefined);
    const { deleteCustomerAction } = await import('@/lib/actions/customer-actions');
    await deleteCustomerAction('cust-1');
    expect(mockDeleteCustomer).toHaveBeenCalledWith('cust-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/customers');
  });
});

describe('Portal Actions - signConsentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns error when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { signConsentAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    const result = await signConsentAction(formData);
    expect(result).toEqual({ success: false, error: 'You must be logged in to sign consent.' });
  });

  it('returns error when validation fails (missing sessionId)', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    const { signConsentAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    // Missing sessionId, signedName, acknowledged
    const result = await signConsentAction(formData);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error when no linked customer', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue(null);
    const { signConsentAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    formData.set('signedName', 'John Doe');
    formData.set('acknowledged', 'true');
    const result = await signConsentAction(formData);
    expect(result).toEqual({ success: false, error: 'No linked customer account found.' });
  });

  it('returns error when tattoo session not found', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue({ id: 'c1' });
    mockTattooSessionFindFirst.mockResolvedValue(null);
    const { signConsentAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    formData.set('signedName', 'John Doe');
    formData.set('acknowledged', 'true');
    const result = await signConsentAction(formData);
    expect(result).toEqual({ success: false, error: 'Tattoo session not found.' });
  });

  it('returns error when consent already signed', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue({ id: 'c1' });
    mockTattooSessionFindFirst.mockResolvedValue({ id: TEST_SESSION_UUID, consentSignedAt: new Date() });
    const { signConsentAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    formData.set('signedName', 'John Doe');
    formData.set('acknowledged', 'true');
    const result = await signConsentAction(formData);
    expect(result).toEqual({ success: false, error: 'Consent has already been signed for this session.' });
  });

  it('returns success on valid consent signing', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue({ id: 'c1' });
    mockTattooSessionFindFirst.mockResolvedValue({ id: TEST_SESSION_UUID, customerId: 'c1', consentSignedAt: null });
    const { signConsentAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    formData.set('sessionId', TEST_SESSION_UUID);
    formData.set('signedName', 'John Doe');
    formData.set('acknowledged', 'true');
    const result = await signConsentAction(formData);
    expect(result).toEqual({ success: true });
  });
});

describe('Portal Actions - updateProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns error when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateProfileAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    const result = await updateProfileAction(formData);
    expect(result).toEqual({ success: false, error: 'You must be logged in to update your profile.' });
  });

  it('returns success with valid profile data', async () => {
    mockGetCurrentSession.mockResolvedValue(staffSession);
    mockCustomerFindFirst.mockResolvedValue({ id: 'c1' });
    const { updateProfileAction } = await import('@/lib/actions/portal-actions');
    const formData = new FormData();
    formData.set('firstName', 'Jane');
    formData.set('lastName', 'Smith');
    const result = await updateProfileAction(formData);
    expect(result).toEqual({ success: true });
  });
});
