import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockRequireRole = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockDeleteProduct = vi.fn();
const mockGetProductById = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockStripeProductsCreate = vi.fn();
const mockStripePricesCreate = vi.fn();
const mockStripeProductsUpdate = vi.fn();
const mockStripePricesUpdate = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    products: {
      create: (...args: unknown[]) => mockStripeProductsCreate(...args),
      update: (...args: unknown[]) => mockStripeProductsUpdate(...args),
    },
    prices: {
      create: (...args: unknown[]) => mockStripePricesCreate(...args),
      update: (...args: unknown[]) => mockStripePricesUpdate(...args),
    },
  },
  dollarsToStripeCents: (d: number) => Math.round(d * 100),
}));

vi.mock('@/lib/dal/products', () => ({
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  deleteProduct: (...args: unknown[]) => mockDeleteProduct(...args),
  getProductById: (...args: unknown[]) => mockGetProductById(...args),
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

describe('Product Actions - createProductAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { createProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('name', 'Test Product');
    formData.set('price', '25');
    formData.set('productType', 'PHYSICAL');
    await expect(createProductAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns validation error with invalid data', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    const { createProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    // Missing required name
    formData.set('name', '');
    formData.set('price', '-5');
    formData.set('productType', 'INVALID');
    const result = await createProductAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
    }
  });

  it('creates product with Stripe sync on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockStripeProductsCreate.mockResolvedValue({ id: 'prod_stripe_1' });
    mockStripePricesCreate.mockResolvedValue({ id: 'price_stripe_1' });
    mockCreateProduct.mockResolvedValue({ id: 'prod-1' });
    const { createProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('name', 'Test Sticker Pack');
    formData.set('price', '15');
    formData.set('productType', 'PHYSICAL');
    const result = await createProductAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'prod-1' });
    }
    expect(mockStripeProductsCreate).toHaveBeenCalledTimes(1);
    expect(mockStripePricesCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateProduct).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/products');
  });
});

describe('Product Actions - updateProductAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { updateProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('id', '550e8400-e29b-41d4-a716-446655440000');
    formData.set('name', 'Updated');
    await expect(updateProductAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns error when product not found', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetProductById.mockResolvedValue(null);
    const { updateProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('id', '550e8400-e29b-41d4-a716-446655440000');
    formData.set('name', 'Updated');
    const result = await updateProductAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('updates product on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetProductById.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Old Name',
      price: '15',
      stripeProductId: 'prod_stripe_1',
      stripePriceId: 'price_stripe_1',
    });
    mockStripeProductsUpdate.mockResolvedValue({});
    mockUpdateProduct.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
    const { updateProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('id', '550e8400-e29b-41d4-a716-446655440000');
    formData.set('name', 'Updated Product');
    const result = await updateProductAction(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
    }
  });
});

describe('Product Actions - deleteProductAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when requireRole fails', async () => {
    mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
    const { deleteProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('productId', 'prod-1');
    await expect(deleteProductAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('returns error when product not found', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetProductById.mockResolvedValue(null);
    const { deleteProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('productId', '550e8400-e29b-41d4-a716-446655440000');
    const result = await deleteProductAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('deletes product and archives in Stripe on success', async () => {
    mockRequireRole.mockResolvedValue(adminSession);
    mockGetProductById.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Product to Delete',
      stripeProductId: 'prod_stripe_1',
    });
    mockDeleteProduct.mockResolvedValue(undefined);
    mockStripeProductsUpdate.mockResolvedValue({});
    const { deleteProductAction } = await import('@/lib/actions/product-actions');
    const formData = new FormData();
    formData.set('productId', '550e8400-e29b-41d4-a716-446655440000');
    const result = await deleteProductAction(formData);
    expect(result.success).toBe(true);
    expect(mockDeleteProduct).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(mockStripeProductsUpdate).toHaveBeenCalledWith('prod_stripe_1', { active: false });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/products');
  });
});
