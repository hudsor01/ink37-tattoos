import { describe, it, expect } from 'vitest';
import {
  CreateProductSchema,
  PurchaseGiftCardSchema,
  RedeemGiftCardSchema,
  StoreCheckoutSchema,
  UpdateOrderStatusSchema,
} from '@/lib/security/validation';

describe('CreateProductSchema', () => {
  it('accepts valid product data', () => {
    const result = CreateProductSchema.safeParse({
      name: 'Ink 37 T-Shirt',
      price: 29.99,
      productType: 'PHYSICAL',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateProductSchema.safeParse({
      name: '',
      price: 29.99,
      productType: 'PHYSICAL',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = CreateProductSchema.safeParse({
      name: 'Test',
      price: -5,
      productType: 'PHYSICAL',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid product type', () => {
    const result = CreateProductSchema.safeParse({
      name: 'Test',
      price: 10,
      productType: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all three product types', () => {
    for (const type of ['PHYSICAL', 'DIGITAL', 'GIFT_CARD']) {
      const result = CreateProductSchema.safeParse({
        name: 'Test',
        price: 10,
        productType: type,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('PurchaseGiftCardSchema', () => {
  it('accepts valid gift card purchase', () => {
    const result = PurchaseGiftCardSchema.safeParse({
      denomination: '100',
      recipientName: 'Jane Doe',
      recipientEmail: 'jane@example.com',
      senderName: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid denomination', () => {
    const result = PurchaseGiftCardSchema.safeParse({
      denomination: '75',
      recipientName: 'Jane',
      recipientEmail: 'jane@example.com',
      senderName: 'John',
    });
    expect(result.success).toBe(false);
  });
});

describe('RedeemGiftCardSchema', () => {
  it('accepts valid INK37 code format', () => {
    const result = RedeemGiftCardSchema.safeParse({
      code: 'INK37-ABCD-EFGH-JKLM',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid code format', () => {
    const result = RedeemGiftCardSchema.safeParse({
      code: 'INVALID-CODE',
    });
    expect(result.success).toBe(false);
  });
});

describe('StoreCheckoutSchema', () => {
  it('accepts valid checkout data', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty cart', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateOrderStatusSchema', () => {
  it('accepts valid status update', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'SHIPPED',
    });
    expect(result.success).toBe(true);
  });

  it('rejects PENDING as update target', () => {
    const result = UpdateOrderStatusSchema.safeParse({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'PENDING',
    });
    expect(result.success).toBe(false);
  });
});
