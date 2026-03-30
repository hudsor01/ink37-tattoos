import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scope mocks
const mockGetCurrentSession = vi.fn();
const mockGetOrderById = vi.fn();
const mockUpdateOrderStatus = vi.fn();
const mockUpdateOrderTracking = vi.fn();
const mockLogAudit = vi.fn();
const mockRevalidatePath = vi.fn();
const mockStripeRefundsCreate = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getCurrentSession: (...args: unknown[]) => mockGetCurrentSession(...args),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: (...args: unknown[]) => mockStripeRefundsCreate(...args),
    },
  },
}));

vi.mock('@/lib/dal/orders', () => ({
  getOrderById: (...args: unknown[]) => mockGetOrderById(...args),
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
  updateOrderTracking: (...args: unknown[]) => mockUpdateOrderTracking(...args),
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
const TEST_ORDER_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('Order Actions - updateOrderStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateOrderStatusAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('orderId', TEST_ORDER_UUID);
    formData.set('status', 'SHIPPED');
    await expect(updateOrderStatusAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('throws validation error with invalid status', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { updateOrderStatusAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('orderId', TEST_ORDER_UUID);
    formData.set('status', 'INVALID_STATUS');
    await expect(updateOrderStatusAction(formData)).rejects.toThrow();
  });

  it('updates order status on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockUpdateOrderStatus.mockResolvedValue(undefined);
    const { updateOrderStatusAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('orderId', TEST_ORDER_UUID);
    formData.set('status', 'SHIPPED');
    const result = await updateOrderStatusAction(formData);
    expect(result).toEqual({ success: true });
    expect(mockUpdateOrderStatus).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/orders');
  });
});

describe('Order Actions - updateOrderTrackingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { updateOrderTrackingAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('id', TEST_ORDER_UUID);
    formData.set('trackingNumber', '1Z999AA10123456784');
    formData.set('trackingCarrier', 'UPS');
    await expect(updateOrderTrackingAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('throws validation error with invalid carrier', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    const { updateOrderTrackingAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('id', TEST_ORDER_UUID);
    formData.set('trackingNumber', '1Z999');
    formData.set('trackingCarrier', 'INVALID_CARRIER');
    await expect(updateOrderTrackingAction(formData)).rejects.toThrow();
  });

  it('updates tracking on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockUpdateOrderTracking.mockResolvedValue(undefined);
    const { updateOrderTrackingAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('id', TEST_ORDER_UUID);
    formData.set('trackingNumber', '1Z999AA10123456784');
    formData.set('trackingCarrier', 'UPS');
    const result = await updateOrderTrackingAction(formData);
    expect(result).toEqual({ success: true });
    expect(mockUpdateOrderTracking).toHaveBeenCalledTimes(1);
  });
});

describe('Order Actions - refundOrderAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws Unauthorized when no session', async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { refundOrderAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('orderId', TEST_ORDER_UUID);
    await expect(refundOrderAction(formData)).rejects.toThrow('Unauthorized');
  });

  it('throws when order not found', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockGetOrderById.mockResolvedValue(null);
    const { refundOrderAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('orderId', TEST_ORDER_UUID);
    await expect(refundOrderAction(formData)).rejects.toThrow('Order not found');
  });

  it('refunds order via Stripe on success', async () => {
    mockGetCurrentSession.mockResolvedValue(adminSession);
    mockGetOrderById.mockResolvedValue({
      id: TEST_ORDER_UUID,
      stripePaymentIntentId: 'pi_test123',
    });
    mockStripeRefundsCreate.mockResolvedValue({ id: 're_test123' });
    mockUpdateOrderStatus.mockResolvedValue(undefined);
    const { refundOrderAction } = await import('@/lib/actions/order-actions');
    const formData = new FormData();
    formData.set('orderId', TEST_ORDER_UUID);
    const result = await refundOrderAction(formData);
    expect(result).toEqual({ success: true });
    expect(mockStripeRefundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_test123',
    });
  });
});
