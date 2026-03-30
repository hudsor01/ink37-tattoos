import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockGetPaymentWithDetails = vi.fn();
const mockGetSettingByKey = vi.fn();
const mockRenderInvoiceHtml = vi.fn();
const mockSendInvoiceEmail = vi.fn();
const mockLogAudit = vi.fn();
const mockCreateNotificationForAdmins = vi.fn();
const mockRevalidatePath = vi.fn();
const mockFetch = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/dal/payments', () => ({
  getPaymentWithDetails: (...args: unknown[]) => mockGetPaymentWithDetails(...args),
}));

vi.mock('@/lib/dal/settings', () => ({
  getSettingByKey: (...args: unknown[]) => mockGetSettingByKey(...args),
}));

vi.mock('@/lib/invoice-template', () => ({
  renderInvoiceHtml: (...args: unknown[]) => mockRenderInvoiceHtml(...args),
}));

vi.mock('@/lib/email/resend', () => ({
  sendInvoiceEmail: (...args: unknown[]) => mockSendInvoiceEmail(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('@/lib/dal/notifications', () => ({
  createNotificationForAdmins: (...args: unknown[]) => mockCreateNotificationForAdmins(...args),
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

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };

// Mock global fetch for Stirling PDF
const originalFetch = globalThis.fetch;

describe('Invoice Actions - emailInvoiceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { emailInvoiceAction } = await import('@/lib/actions/invoice-actions');
    await expect(emailInvoiceAction('pay-1')).rejects.toThrow('Unauthorized');
  });

  it('returns error when payment not found', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetPaymentWithDetails.mockResolvedValue(null);
    const { emailInvoiceAction } = await import('@/lib/actions/invoice-actions');
    const result = await emailInvoiceAction('pay-nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('returns error when payment is not completed', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetPaymentWithDetails.mockResolvedValue({
      id: 'pay-1',
      status: 'PENDING',
      amount: 100,
      customer: { email: 'customer@test.com', firstName: 'John', lastName: 'Doe' },
    });
    const { emailInvoiceAction } = await import('@/lib/actions/invoice-actions');
    const result = await emailInvoiceAction('pay-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('sends invoice email on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetPaymentWithDetails.mockResolvedValue({
      id: 'pay-1',
      status: 'COMPLETED',
      amount: 200,
      completedAt: new Date(),
      createdAt: new Date(),
      customer: { email: 'customer@test.com', firstName: 'John', lastName: 'Doe' },
      tattooSession: { designDescription: 'Dragon Sleeve', totalCost: 500, depositAmount: 100 },
    });
    mockGetSettingByKey.mockResolvedValue({ value: 'Custom terms' });
    mockRenderInvoiceHtml.mockReturnValue('<html>Invoice</html>');
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    });
    mockSendInvoiceEmail.mockResolvedValue({ sent: true });

    const { emailInvoiceAction } = await import('@/lib/actions/invoice-actions');
    const result = await emailInvoiceAction('pay-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ sent: true });
    }
    expect(mockSendInvoiceEmail).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/payments');
  });
});
