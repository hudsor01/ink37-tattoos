import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the schema here to test without server-only import
const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  CAL_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_RETENTION_READ_DAYS: z.coerce.number().int().positive().optional(),
  NOTIFICATION_RETENTION_UNREAD_DAYS: z.coerce.number().int().positive().optional(),
  NOTIFICATION_CLEANUP_BATCH_SIZE: z.coerce.number().int().positive().optional(),
});

describe('Environment validation', () => {
  it('passes with valid env vars', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'https://db.neon.tech/ink37',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(result.success).toBe(true);
  });

  it('fails when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse({
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(result.success).toBe(false);
  });

  it('fails when BETTER_AUTH_SECRET is too short', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'https://db.neon.tech/ink37',
      BETTER_AUTH_SECRET: 'short',
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    });
    expect(result.success).toBe(false);
  });
});

// Required fields shared across notification retention tests
const validBase = {
  DATABASE_URL: 'https://db.neon.tech/ink37',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

describe('notification retention env coercion', () => {
  it("accepts numeric string '30' and coerces to number 30", () => {
    const result = envSchema.safeParse({
      ...validBase,
      NOTIFICATION_RETENTION_READ_DAYS: '30',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NOTIFICATION_RETENTION_READ_DAYS).toBe(30);
      expect(typeof result.data.NOTIFICATION_RETENTION_READ_DAYS).toBe('number');
    }
  });

  it('accepts undefined (uses optional default)', () => {
    const result = envSchema.safeParse({
      ...validBase,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NOTIFICATION_RETENTION_READ_DAYS).toBeUndefined();
    }
  });

  it("rejects non-numeric string 'abc'", () => {
    const result = envSchema.safeParse({
      ...validBase,
      NOTIFICATION_RETENTION_READ_DAYS: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative number '-5'", () => {
    const result = envSchema.safeParse({
      ...validBase,
      NOTIFICATION_RETENTION_READ_DAYS: '-5',
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero '0'", () => {
    const result = envSchema.safeParse({
      ...validBase,
      NOTIFICATION_RETENTION_READ_DAYS: '0',
    });
    expect(result.success).toBe(false);
  });
});
