import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockCreateConsentFormVersion = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockDbUpdateSetWhereReturning = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('next/navigation', () => ({
  unauthorized: () => { throw new Error('UNAUTHORIZED'); },
  forbidden: () => { throw new Error('FORBIDDEN'); },
}));

vi.mock('@/lib/dal/consent', () => ({
  createConsentFormVersion: (...args: unknown[]) => mockCreateConsentFormVersion(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
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

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: (...args: unknown[]) => mockDbUpdateSetWhereReturning(...args),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  consentForm: { id: 'id', isActive: 'isActive' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };

describe('Consent Actions - createConsentFormVersionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UNAUTHORIZED when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { createConsentFormVersionAction } = await import('@/lib/actions/consent-actions');
    const formData = new FormData();
    formData.set('title', 'Test Form');
    formData.set('content', 'Test content that is long enough');
    await expect(createConsentFormVersionAction(formData)).rejects.toThrow('UNAUTHORIZED');
  });

  it('throws validation error with invalid data', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { createConsentFormVersionAction } = await import('@/lib/actions/consent-actions');
    const formData = new FormData();
    formData.set('title', '');
    formData.set('content', 'short');
    await expect(createConsentFormVersionAction(formData)).rejects.toThrow();
  });

  it('creates consent form version on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockCreateConsentFormVersion.mockResolvedValue({ id: 'cf-1', version: 1 });
    const { createConsentFormVersionAction } = await import('@/lib/actions/consent-actions');
    const formData = new FormData();
    formData.set('title', 'Consent Form v1');
    formData.set('content', 'This is the consent form content with enough length');
    const result = await createConsentFormVersionAction(formData);
    expect(result).toEqual({ id: 'cf-1', version: 1 });
    expect(mockCreateConsentFormVersion).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/consent');
  });
});

describe('Consent Actions - deactivateConsentFormAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UNAUTHORIZED when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { deactivateConsentFormAction } = await import('@/lib/actions/consent-actions');
    await expect(deactivateConsentFormAction('cf-1')).rejects.toThrow('UNAUTHORIZED');
  });

  it('throws when consent form not found', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockDbUpdateSetWhereReturning.mockResolvedValue([]);
    const { deactivateConsentFormAction } = await import('@/lib/actions/consent-actions');
    await expect(deactivateConsentFormAction('cf-nonexistent')).rejects.toThrow('Consent form not found');
  });

  it('deactivates consent form on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockDbUpdateSetWhereReturning.mockResolvedValue([{ id: 'cf-1', isActive: false }]);
    const { deactivateConsentFormAction } = await import('@/lib/actions/consent-actions');
    const result = await deactivateConsentFormAction('cf-1');
    expect(result).toEqual({ id: 'cf-1', isActive: false });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/consent');
  });
});
