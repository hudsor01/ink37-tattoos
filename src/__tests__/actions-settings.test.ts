import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockUpsertSetting = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/dal/settings', () => ({
  upsertSetting: (...args: unknown[]) => mockUpsertSetting(...args),
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

describe('Settings Actions - upsertSettingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { upsertSettingAction } = await import('@/lib/actions/settings-actions');
    const formData = new FormData();
    formData.set('key', 'site_name');
    formData.set('value', 'Ink37');
    formData.set('category', 'general');
    await expect(upsertSettingAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns validation error with invalid data', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    const { upsertSettingAction } = await import('@/lib/actions/settings-actions');
    const formData = new FormData();
    // Missing required key
    formData.set('key', '');
    formData.set('value', 'test');
    formData.set('category', '');
    const result = await upsertSettingAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('upserts setting on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockUpsertSetting.mockResolvedValue({ key: 'site_name' });
    const { upsertSettingAction } = await import('@/lib/actions/settings-actions');
    const formData = new FormData();
    formData.set('key', 'site_name');
    formData.set('value', '"Ink37 Tattoos"');
    formData.set('category', 'general');
    const result = await upsertSettingAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ key: 'site_name' });
    }
    expect(mockUpsertSetting).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/settings');
  });
});
