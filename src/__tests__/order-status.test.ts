import { describe, it, expect } from 'vitest';
import { UpdateOrderStatusSchema } from '@/lib/security/validation';

describe('UpdateOrderStatusSchema', () => {
  const validOrderId = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts PAID status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'PAID' });
    expect(result.success).toBe(true);
  });

  it('accepts SHIPPED status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'SHIPPED' });
    expect(result.success).toBe(true);
  });

  it('accepts DELIVERED status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'DELIVERED' });
    expect(result.success).toBe(true);
  });

  it('accepts CANCELLED status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'CANCELLED' });
    expect(result.success).toBe(true);
  });

  it('accepts REFUNDED status', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'REFUNDED' });
    expect(result.success).toBe(true);
  });

  it('rejects PENDING as update target', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'PENDING' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status value', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: validOrderId, status: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID orderId', () => {
    const result = UpdateOrderStatusSchema.safeParse({ orderId: 'bad-id', status: 'SHIPPED' });
    expect(result.success).toBe(false);
  });

  it('accepts optional notes', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      orderId: validOrderId,
      status: 'SHIPPED',
      notes: 'Tracking number: 12345',
    });
    expect(result.success).toBe(true);
  });
});
