import { describe, it, expect } from 'vitest';
import { generateGiftCardCode, formatCurrency, GIFT_CARD_DENOMINATIONS } from '@/lib/store-helpers';

describe('generateGiftCardCode', () => {
  it('generates valid INK37-XXXX-XXXX-XXXX format code', () => {
    const code = generateGiftCardCode();
    expect(code).toMatch(/^INK37-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('generates unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateGiftCardCode()));
    expect(codes.size).toBe(100);
  });

  it('excludes ambiguous characters I, O, 0, 1', () => {
    const codes = Array.from({ length: 50 }, () => generateGiftCardCode());
    const allChars = codes.join('').replace(/INK37-/g, '').replace(/-/g, '');
    expect(allChars).not.toMatch(/[IO01]/);
  });
});

describe('formatCurrency', () => {
  it('formats dollars to USD string', () => {
    expect(formatCurrency(25)).toBe('$25.00');
    expect(formatCurrency(7.99)).toBe('$7.99');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('GIFT_CARD_DENOMINATIONS', () => {
  it('contains the five preset denominations', () => {
    expect(GIFT_CARD_DENOMINATIONS).toEqual([25, 50, 100, 200, 500]);
  });
});
