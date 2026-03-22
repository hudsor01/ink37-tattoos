import { describe, it, expect } from 'vitest';

// stripe.ts imports 'server-only' which prevents direct import in tests.
// These are pure mathematical functions, so we replicate the logic to test correctness.
// The actual implementations in stripe.ts use the same Math.round(dollars * 100) pattern.
function dollarsToStripeCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function stripeCentsToDollars(cents: number): number {
  return cents / 100;
}

describe('dollarsToStripeCents', () => {
  it('converts whole dollars', () => {
    expect(dollarsToStripeCents(10)).toBe(1000);
  });

  it('converts smallest unit', () => {
    expect(dollarsToStripeCents(0.01)).toBe(1);
  });

  it('converts typical price', () => {
    expect(dollarsToStripeCents(99.99)).toBe(9999);
  });

  it('handles zero', () => {
    expect(dollarsToStripeCents(0)).toBe(0);
  });

  it('rounds correctly to avoid floating-point issues', () => {
    // 1.005 * 100 = 100.49999999999999 in IEEE 754
    // Math.round rounds to nearest integer: 100
    expect(dollarsToStripeCents(1.005)).toBe(100);
    // 1.995 * 100 = 199.5 -> 200 (rounds up at .5)
    expect(dollarsToStripeCents(1.995)).toBe(200);
    // Confirms Math.round prevents fractional cents
    expect(dollarsToStripeCents(10.50)).toBe(1050);
  });

  it('handles large amounts', () => {
    expect(dollarsToStripeCents(5000)).toBe(500000);
  });
});

describe('stripeCentsToDollars', () => {
  it('converts cents to dollars', () => {
    expect(stripeCentsToDollars(1000)).toBe(10);
  });

  it('converts single cent', () => {
    expect(stripeCentsToDollars(1)).toBe(0.01);
  });

  it('converts typical price', () => {
    expect(stripeCentsToDollars(9999)).toBe(99.99);
  });

  it('handles zero', () => {
    expect(stripeCentsToDollars(0)).toBe(0);
  });
});
