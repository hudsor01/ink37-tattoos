import { describe, it, expect } from 'vitest';
import { StoreCheckoutSchema } from '@/lib/security/validation';

describe('StoreCheckoutSchema', () => {
  it('accepts valid checkout with single item', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts checkout with multiple items', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [
        { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 },
        { productId: '660e8400-e29b-41d4-a716-446655440001', quantity: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts checkout with optional gift card code', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
      giftCardCode: 'INK37-ABCD-EFGH-JKLM',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = StoreCheckoutSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects quantity of 0', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects quantity over 10', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 11 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID product ID', () => {
    const result = StoreCheckoutSchema.safeParse({
      items: [{ productId: 'not-a-uuid', quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });
});
