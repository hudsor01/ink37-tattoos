import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockCreateProductImage = vi.fn();
const mockUpdateImageVisibility = vi.fn();
const mockReorderProductImages = vi.fn();
const mockDeleteProductImage = vi.fn();
const mockSyncPrimaryImage = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockBlobDel = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/dal/product-images', () => ({
  createProductImage: (...args: unknown[]) => mockCreateProductImage(...args),
  updateImageVisibility: (...args: unknown[]) => mockUpdateImageVisibility(...args),
  reorderProductImages: (...args: unknown[]) => mockReorderProductImages(...args),
  deleteProductImage: (...args: unknown[]) => mockDeleteProductImage(...args),
  syncPrimaryImage: (...args: unknown[]) => mockSyncPrimaryImage(...args),
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
const TEST_PRODUCT_UUID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_IMAGE_UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Product Image Actions - addProductImageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { addProductImageAction } = await import('@/lib/actions/product-image-actions');
    await expect(
      addProductImageAction(TEST_PRODUCT_UUID, 'https://example.com/img.jpg')
    ).rejects.toThrow('Unauthorized');
  });

  it('throws validation error with invalid productId', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { addProductImageAction } = await import('@/lib/actions/product-image-actions');
    await expect(
      addProductImageAction('not-a-uuid', 'https://example.com/img.jpg')
    ).rejects.toThrow();
  });

  it('adds product image on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockCreateProductImage.mockResolvedValue({ id: TEST_IMAGE_UUID, url: 'https://example.com/img.jpg' });
    mockSyncPrimaryImage.mockResolvedValue(undefined);
    const { addProductImageAction } = await import('@/lib/actions/product-image-actions');
    const result = await addProductImageAction(TEST_PRODUCT_UUID, 'https://example.com/img.jpg', 'Alt text');
    expect(result.success).toBe(true);
    expect(result.image).toBeDefined();
    expect(mockCreateProductImage).toHaveBeenCalledTimes(1);
    expect(mockSyncPrimaryImage).toHaveBeenCalledWith(TEST_PRODUCT_UUID);
  });
});

describe('Product Image Actions - toggleImageVisibilityAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { toggleImageVisibilityAction } = await import('@/lib/actions/product-image-actions');
    await expect(
      toggleImageVisibilityAction(TEST_IMAGE_UUID, true, TEST_PRODUCT_UUID)
    ).rejects.toThrow('Unauthorized');
  });

  it('toggles image visibility on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockUpdateImageVisibility.mockResolvedValue({ id: TEST_IMAGE_UUID, isVisible: false });
    mockSyncPrimaryImage.mockResolvedValue(undefined);
    const { toggleImageVisibilityAction } = await import('@/lib/actions/product-image-actions');
    const result = await toggleImageVisibilityAction(TEST_IMAGE_UUID, false, TEST_PRODUCT_UUID);
    expect(result.success).toBe(true);
    expect(mockUpdateImageVisibility).toHaveBeenCalledWith(TEST_IMAGE_UUID, false);
  });
});

describe('Product Image Actions - reorderProductImagesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { reorderProductImagesAction } = await import('@/lib/actions/product-image-actions');
    await expect(
      reorderProductImagesAction(TEST_PRODUCT_UUID, [TEST_IMAGE_UUID])
    ).rejects.toThrow('Unauthorized');
  });

  it('throws validation error with invalid IDs', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { reorderProductImagesAction } = await import('@/lib/actions/product-image-actions');
    await expect(
      reorderProductImagesAction(TEST_PRODUCT_UUID, ['not-a-uuid'])
    ).rejects.toThrow();
  });

  it('reorders images on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockReorderProductImages.mockResolvedValue(undefined);
    mockSyncPrimaryImage.mockResolvedValue(undefined);
    const { reorderProductImagesAction } = await import('@/lib/actions/product-image-actions');
    const result = await reorderProductImagesAction(TEST_PRODUCT_UUID, [TEST_IMAGE_UUID]);
    expect(result).toEqual({ success: true });
    expect(mockReorderProductImages).toHaveBeenCalledWith(TEST_PRODUCT_UUID, [TEST_IMAGE_UUID]);
  });
});

describe('Product Image Actions - deleteProductImageAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { deleteProductImageAction } = await import('@/lib/actions/product-image-actions');
    await expect(
      deleteProductImageAction(TEST_IMAGE_UUID, TEST_PRODUCT_UUID)
    ).rejects.toThrow('Unauthorized');
  });

  it('deletes image and blob on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockDeleteProductImage.mockResolvedValue({ id: TEST_IMAGE_UUID, url: 'https://blob.vercel.com/img.jpg' });
    mockBlobDel.mockResolvedValue(undefined);
    mockSyncPrimaryImage.mockResolvedValue(undefined);
    const { deleteProductImageAction } = await import('@/lib/actions/product-image-actions');
    const result = await deleteProductImageAction(TEST_IMAGE_UUID, TEST_PRODUCT_UUID);
    expect(result).toEqual({ success: true });
    expect(mockDeleteProductImage).toHaveBeenCalledWith(TEST_IMAGE_UUID);
    expect(mockBlobDel).toHaveBeenCalledWith('https://blob.vercel.com/img.jpg');
    expect(mockSyncPrimaryImage).toHaveBeenCalledWith(TEST_PRODUCT_UUID);
  });
});
