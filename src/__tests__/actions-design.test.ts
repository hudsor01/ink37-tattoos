import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockUpdateDesignApprovalStatus = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/dal/designs', () => ({
  updateDesignApprovalStatus: (...args: unknown[]) => mockUpdateDesignApprovalStatus(...args),
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

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };

describe('Design Approval Actions - approveDesignAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { approveDesignAction } = await import('@/lib/actions/design-approval-actions');
    await expect(approveDesignAction('design-1')).rejects.toThrow('Unauthorized');
  });

  it('returns error when design not found (DAL throws)', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockUpdateDesignApprovalStatus.mockRejectedValue(new Error('Design does not exist'));
    const { approveDesignAction } = await import('@/lib/actions/design-approval-actions');
    const result = await approveDesignAction('design-nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('approves design on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockUpdateDesignApprovalStatus.mockResolvedValue({ id: 'design-1', name: 'Dragon Sleeve' });
    const { approveDesignAction } = await import('@/lib/actions/design-approval-actions');
    const result = await approveDesignAction('design-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'design-1' });
    }
    expect(mockUpdateDesignApprovalStatus).toHaveBeenCalledWith('design-1', true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/designs');
  });
});

describe('Design Approval Actions - rejectDesignAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { rejectDesignAction } = await import('@/lib/actions/design-approval-actions');
    await expect(rejectDesignAction('design-1', 'Not suitable')).rejects.toThrow('Unauthorized');
  });

  it('returns error when design not found', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockUpdateDesignApprovalStatus.mockRejectedValue(new Error('Design does not exist'));
    const { rejectDesignAction } = await import('@/lib/actions/design-approval-actions');
    const result = await rejectDesignAction('design-nonexistent', 'Reason');
    expect(result.success).toBe(false);
  });

  it('rejects design with notes on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockUpdateDesignApprovalStatus.mockResolvedValue({ id: 'design-1', name: 'Dragon Sleeve' });
    const { rejectDesignAction } = await import('@/lib/actions/design-approval-actions');
    const result = await rejectDesignAction('design-1', 'Needs more detail');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'design-1' });
    }
    expect(mockUpdateDesignApprovalStatus).toHaveBeenCalledWith('design-1', false, 'Needs more detail');
  });
});
