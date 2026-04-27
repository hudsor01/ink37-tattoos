import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockUnauthorized = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('next/navigation', () => ({
  unauthorized: () => {
    mockUnauthorized();
    throw new Error('UNAUTHORIZED');
  },
}));

vi.mock('@/lib/dal/notifications', () => ({
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const userSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };

describe('Notification Actions - markNotificationReadAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { markNotificationReadAction } = await import('@/lib/actions/notification-actions');
    await expect(markNotificationReadAction('notif-1')).rejects.toThrow('UNAUTHORIZED');
    expect(mockUnauthorized).toHaveBeenCalled();
  });

  it('returns error when markAsRead throws', async () => {
    mockGetCurrentSession.mockResolvedValue(userSession);
    mockMarkAsRead.mockRejectedValue(new Error('DB error'));
    const { markNotificationReadAction } = await import('@/lib/actions/notification-actions');
    const result = await markNotificationReadAction('notif-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to mark notification as read');
    }
  });

  it('marks notification as read on success', async () => {
    mockGetCurrentSession.mockResolvedValue(userSession);
    mockMarkAsRead.mockResolvedValue({ id: 'notif-1', isRead: true });
    const { markNotificationReadAction } = await import('@/lib/actions/notification-actions');
    const result = await markNotificationReadAction('notif-1');
    expect(result.success).toBe(true);
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/notifications');
  });
});

describe('Notification Actions - markAllNotificationsReadAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { markAllNotificationsReadAction } = await import('@/lib/actions/notification-actions');
    await expect(markAllNotificationsReadAction()).rejects.toThrow('UNAUTHORIZED');
    expect(mockUnauthorized).toHaveBeenCalled();
  });

  it('returns error when markAllAsRead throws', async () => {
    mockGetCurrentSession.mockResolvedValue(userSession);
    mockMarkAllAsRead.mockRejectedValue(new Error('DB error'));
    const { markAllNotificationsReadAction } = await import('@/lib/actions/notification-actions');
    const result = await markAllNotificationsReadAction();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to mark all notifications as read');
    }
  });

  it('marks all notifications as read on success', async () => {
    mockGetCurrentSession.mockResolvedValue(userSession);
    mockMarkAllAsRead.mockResolvedValue(undefined);
    const { markAllNotificationsReadAction } = await import('@/lib/actions/notification-actions');
    const result = await markAllNotificationsReadAction();
    expect(result.success).toBe(true);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith('user-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/notifications');
  });
});
