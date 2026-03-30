import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockGetCurrentSession = vi.fn();
const mockCreateSession = vi.fn();
const mockUpdateSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockGetSessionById = vi.fn();
const mockGetSessionWithDetails = vi.fn();
const mockGetSettingByKey = vi.fn();
const mockSendAftercareEmail = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockBlobDel = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/dal/sessions', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
  getSessionWithDetails: (...args: unknown[]) => mockGetSessionWithDetails(...args),
}));

vi.mock('@/lib/dal/settings', () => ({
  getSettingByKey: (...args: unknown[]) => mockGetSettingByKey(...args),
}));

vi.mock('@/lib/email/resend', () => ({
  sendAftercareEmail: (...args: unknown[]) => mockSendAftercareEmail(...args),
}));

vi.mock('@/lib/dal/audit', () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

vi.mock('@vercel/blob', () => ({
  del: (...args: unknown[]) => mockBlobDel(...args),
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
  after: vi.fn((fn: () => void | Promise<void>) => {
    const result = fn();
    if (result instanceof Promise) result.catch(() => {});
    return result;
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  tattooSession: { id: 'id', aftercareProvided: 'aftercareProvided' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('March 30, 2026'),
}));

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };
const TEST_CUSTOMER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_ARTIST_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('Session Actions - createSessionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { createSessionAction } = await import('@/lib/actions/session-actions');
    const formData = new FormData();
    formData.set('customerId', TEST_CUSTOMER_UUID);
    formData.set('artistId', TEST_ARTIST_UUID);
    formData.set('appointmentDate', '2026-04-01T10:00:00.000Z');
    formData.set('duration', '60');
    formData.set('designDescription', 'Dragon');
    formData.set('placement', 'Upper Arm');
    formData.set('size', 'Medium');
    formData.set('style', 'Japanese');
    formData.set('hourlyRate', '150');
    formData.set('estimatedHours', '3');
    formData.set('totalCost', '450');
    await expect(createSessionAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns validation error with invalid data', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    const { createSessionAction } = await import('@/lib/actions/session-actions');
    const formData = new FormData();
    formData.set('customerId', 'not-a-uuid');
    formData.set('artistId', 'not-a-uuid');
    formData.set('appointmentDate', 'bad-date');
    formData.set('duration', '0');
    formData.set('designDescription', '');
    formData.set('placement', '');
    formData.set('size', '');
    formData.set('style', '');
    formData.set('hourlyRate', '0');
    formData.set('estimatedHours', '0');
    formData.set('totalCost', '0');
    const result = await createSessionAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('creates session on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockCreateSession.mockResolvedValue({ id: 'session-1' });
    const { createSessionAction } = await import('@/lib/actions/session-actions');
    const formData = new FormData();
    formData.set('customerId', TEST_CUSTOMER_UUID);
    formData.set('artistId', TEST_ARTIST_UUID);
    formData.set('appointmentDate', '2026-04-01T10:00:00.000Z');
    formData.set('duration', '60');
    formData.set('designDescription', 'Dragon Sleeve');
    formData.set('placement', 'Upper Arm');
    formData.set('size', 'Large');
    formData.set('style', 'Japanese');
    formData.set('hourlyRate', '150');
    formData.set('estimatedHours', '3');
    formData.set('totalCost', '450');
    const result = await createSessionAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'session-1' });
    }
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/sessions');
  });
});

describe('Session Actions - deleteSessionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { deleteSessionAction } = await import('@/lib/actions/session-actions');
    await expect(deleteSessionAction('session-1')).rejects.toThrow('Unauthorized');
  });

  it('deletes session on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockDeleteSession.mockResolvedValue(undefined);
    const { deleteSessionAction } = await import('@/lib/actions/session-actions');
    const result = await deleteSessionAction('session-1');
    expect(result.success).toBe(true);
    expect(mockDeleteSession).toHaveBeenCalledWith('session-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/sessions');
  });
});

describe('Session Actions - updateSessionFieldAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateSessionFieldAction } = await import('@/lib/actions/session-actions');
    await expect(updateSessionFieldAction('s-1', 'notes', 'updated')).rejects.toThrow('Unauthorized');
  });

  it('returns error for disallowed field', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { updateSessionFieldAction } = await import('@/lib/actions/session-actions');
    const result = await updateSessionFieldAction('s-1', 'customerId', 'new-id');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not editable');
    }
  });

  it('updates allowed field on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockUpdateSession.mockResolvedValue({ id: 's-1' });
    const { updateSessionFieldAction } = await import('@/lib/actions/session-actions');
    const result = await updateSessionFieldAction('s-1', 'designDescription', 'Updated dragon');
    expect(result.success).toBe(true);
    expect(mockUpdateSession).toHaveBeenCalledWith('s-1', { designDescription: 'Updated dragon' });
  });
});

describe('Session Actions - addSessionImageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { addSessionImageAction } = await import('@/lib/actions/session-actions');
    await expect(addSessionImageAction('s-1', 'https://example.com/img.jpg')).rejects.toThrow('Unauthorized');
  });

  it('returns error when session not found', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockGetSessionById.mockResolvedValue(null);
    const { addSessionImageAction } = await import('@/lib/actions/session-actions');
    const result = await addSessionImageAction('s-nonexistent', 'https://example.com/img.jpg');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Session not found');
    }
  });

  it('adds image on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockGetSessionById.mockResolvedValue({ id: 's-1', referenceImages: ['img1.jpg'] });
    mockUpdateSession.mockResolvedValue({ id: 's-1' });
    const { addSessionImageAction } = await import('@/lib/actions/session-actions');
    const result = await addSessionImageAction('s-1', 'https://example.com/img2.jpg');
    expect(result.success).toBe(true);
  });
});
