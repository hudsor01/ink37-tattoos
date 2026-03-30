import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockCreateMediaItem = vi.fn();
const mockUpdateMediaItem = vi.fn();
const mockDeleteMediaItem = vi.fn();
const mockGetMediaItemById = vi.fn();
const mockTogglePublicVisibility = vi.fn();
const mockBulkUpdateTags = vi.fn();
const mockToggleMediaApproval = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockBlobDel = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/dal/media', () => ({
  createMediaItem: (...args: unknown[]) => mockCreateMediaItem(...args),
  updateMediaItem: (...args: unknown[]) => mockUpdateMediaItem(...args),
  deleteMediaItem: (...args: unknown[]) => mockDeleteMediaItem(...args),
  getMediaItemById: (...args: unknown[]) => mockGetMediaItemById(...args),
  togglePublicVisibility: (...args: unknown[]) => mockTogglePublicVisibility(...args),
  bulkUpdateTags: (...args: unknown[]) => mockBulkUpdateTags(...args),
  toggleMediaApproval: (...args: unknown[]) => mockToggleMediaApproval(...args),
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
  after: vi.fn((fn: () => void) => fn()),
}));

const adminSession = { user: { id: 'user-1', role: 'admin', email: 'admin@test.com' } };

describe('Media Actions - createMediaAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { createMediaAction } = await import('@/lib/actions/media-actions');
    const formData = new FormData();
    formData.set('name', 'Test Image');
    formData.set('fileUrl', 'https://example.com/image.jpg');
    formData.set('artistId', 'artist-1');
    await expect(createMediaAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns error when DAL throws', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockCreateMediaItem.mockRejectedValue(new Error('Artist not found'));
    const { createMediaAction } = await import('@/lib/actions/media-actions');
    const formData = new FormData();
    formData.set('name', 'Test Image');
    formData.set('fileUrl', 'https://example.com/image.jpg');
    formData.set('artistId', 'artist-bad');
    const result = await createMediaAction(formData);
    expect(result.success).toBe(false);
  });

  it('creates media item on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockCreateMediaItem.mockResolvedValue({ id: 'media-1' });
    const { createMediaAction } = await import('@/lib/actions/media-actions');
    const formData = new FormData();
    formData.set('name', 'Test Image');
    formData.set('fileUrl', 'https://example.com/image.jpg');
    formData.set('artistId', 'artist-1');
    const result = await createMediaAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'media-1' });
    }
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/media');
  });
});

describe('Media Actions - deleteMediaAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { deleteMediaAction } = await import('@/lib/actions/media-actions');
    await expect(deleteMediaAction('media-1')).rejects.toThrow('Unauthorized');
  });

  it('deletes media and blob on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetMediaItemById.mockResolvedValue({
      id: 'media-1',
      fileUrl: 'https://blob.vercel.com/file.jpg',
      thumbnailUrl: 'https://blob.vercel.com/thumb.jpg',
    });
    mockBlobDel.mockResolvedValue(undefined);
    mockDeleteMediaItem.mockResolvedValue(undefined);
    const { deleteMediaAction } = await import('@/lib/actions/media-actions');
    const result = await deleteMediaAction('media-1');
    expect(result.success).toBe(true);
    expect(mockBlobDel).toHaveBeenCalledTimes(2);
    expect(mockDeleteMediaItem).toHaveBeenCalledWith('media-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/media');
  });
});

describe('Media Actions - toggleVisibilityAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { toggleVisibilityAction } = await import('@/lib/actions/media-actions');
    await expect(toggleVisibilityAction('media-1', true)).rejects.toThrow('Unauthorized');
  });

  it('toggles visibility on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockTogglePublicVisibility.mockResolvedValue({ id: 'media-1' });
    const { toggleVisibilityAction } = await import('@/lib/actions/media-actions');
    const result = await toggleVisibilityAction('media-1', true);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'media-1' });
    }
    expect(mockTogglePublicVisibility).toHaveBeenCalledWith('media-1', true);
  });
});

describe('Media Actions - bulkAssignTagsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { bulkAssignTagsAction } = await import('@/lib/actions/media-actions');
    await expect(bulkAssignTagsAction(['m-1'], ['tag1'])).rejects.toThrow('Unauthorized');
  });

  it('assigns tags in bulk on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockBulkUpdateTags.mockResolvedValue([{ id: 'm-1' }, { id: 'm-2' }]);
    const { bulkAssignTagsAction } = await import('@/lib/actions/media-actions');
    const result = await bulkAssignTagsAction(['m-1', 'm-2'], ['dragon', 'color']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ count: 2 });
    }
  });
});
