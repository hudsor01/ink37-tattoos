import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockCreateGiftCard = vi.fn();
const mockDeactivateGiftCard = vi.fn();
const mockSendGiftCardEmail = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/dal/gift-cards', () => ({
  createGiftCard: (...args: unknown[]) => mockCreateGiftCard(...args),
  deactivateGiftCard: (...args: unknown[]) => mockDeactivateGiftCard(...args),
}));

vi.mock('@/lib/email/resend', () => ({
  sendGiftCardEmail: (...args: unknown[]) => mockSendGiftCardEmail(...args),
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

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com', name: 'Admin' } };

describe('Gift Card Admin Actions - issueGiftCardAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { issueGiftCardAction } = await import('@/lib/actions/gift-card-admin-actions');
    await expect(
      issueGiftCardAction({ amount: 50, recipientEmail: 'test@test.com' })
    ).rejects.toThrow('Unauthorized');
  });

  it('returns validation error with invalid data', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { issueGiftCardAction } = await import('@/lib/actions/gift-card-admin-actions');
    const result = await issueGiftCardAction({ amount: 2, recipientEmail: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it('issues gift card on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockCreateGiftCard.mockResolvedValue({ id: 'gc-1', code: 'GC-ABC123' });
    mockSendGiftCardEmail.mockResolvedValue(undefined);
    const { issueGiftCardAction } = await import('@/lib/actions/gift-card-admin-actions');
    const result = await issueGiftCardAction({
      amount: 50,
      recipientEmail: 'recipient@test.com',
      recipientName: 'Jane',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('GC-ABC123');
      expect(result.data.emailFailed).toBe(false);
    }
    expect(mockCreateGiftCard).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/gift-cards');
  });
});

describe('Gift Card Admin Actions - deactivateGiftCardAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { deactivateGiftCardAction } = await import('@/lib/actions/gift-card-admin-actions');
    await expect(deactivateGiftCardAction('gc-1')).rejects.toThrow('Unauthorized');
  });

  it('returns error when deactivation fails', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockDeactivateGiftCard.mockRejectedValue(new Error('Not found'));
    const { deactivateGiftCardAction } = await import('@/lib/actions/gift-card-admin-actions');
    const result = await deactivateGiftCardAction('gc-nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to deactivate gift card');
    }
  });

  it('deactivates gift card on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockDeactivateGiftCard.mockResolvedValue(undefined);
    const { deactivateGiftCardAction } = await import('@/lib/actions/gift-card-admin-actions');
    const result = await deactivateGiftCardAction('gc-1');
    expect(result.success).toBe(true);
    expect(mockDeactivateGiftCard).toHaveBeenCalledWith('gc-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/gift-cards');
  });
});
