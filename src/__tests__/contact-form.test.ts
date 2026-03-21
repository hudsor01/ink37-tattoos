import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactFormSchema } from '@/lib/security/validation';

// Mock server-only module
vi.mock('server-only', () => ({}));

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    contact: {
      create: vi.fn().mockResolvedValue({
        id: 'test-id',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock the email module
vi.mock('@/lib/email/resend', () => ({
  sendContactNotification: vi.fn().mockResolvedValue({
    adminSent: true,
    customerSent: true,
  }),
}));

// Mock the rate limiter
vi.mock('@/lib/security/rate-limiter', () => ({
  rateLimit: vi.fn().mockReturnValue(true),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('127.0.0.1'),
  }),
}));

describe('ContactFormSchema validation', () => {
  it('validates valid contact form data', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I want a tattoo consultation.',
    });
    expect(result.success).toBe(true);
  });

  it('validates with optional phone', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      message: 'Hello!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = ContactFormSchema.safeParse({
      name: '',
      email: 'john@example.com',
      message: 'Hello!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
    }
  });

  it('rejects invalid email', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John',
      email: 'not-an-email',
      message: 'Hello!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.email).toBeDefined();
    }
  });

  it('rejects empty message', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      message: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.message).toBeDefined();
    }
  });
});

describe('submitContactForm Server Action', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-establish default mock return values after clearing
    const rateLimiterMod = await import('@/lib/security/rate-limiter');
    vi.mocked(rateLimiterMod.rateLimit).mockReturnValue(true);

    const dbMod = await import('@/lib/db');
    vi.mocked(dbMod.db.contact.create).mockResolvedValue({
      id: 'test-id',
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello',
      status: 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const emailMod = await import('@/lib/email/resend');
    vi.mocked(emailMod.sendContactNotification).mockResolvedValue({
      adminSent: true,
      customerSent: true,
    });

    const headersMod = await import('next/headers');
    vi.mocked(headersMod.headers).mockResolvedValue({
      get: vi.fn().mockReturnValue('127.0.0.1'),
    } as any);
  });

  it('returns success for valid submission', async () => {
    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'john@example.com');
    formData.set('message', 'I want a tattoo consultation.');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(true);
  });

  it('returns errors for invalid email', async () => {
    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'not-an-email');
    formData.set('message', 'Hello!');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.email).toBeDefined();
  });

  it('returns errors for empty name', async () => {
    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', '');
    formData.set('email', 'john@example.com');
    formData.set('message', 'Hello!');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.name).toBeDefined();
  });

  it('returns errors for empty message', async () => {
    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John');
    formData.set('email', 'john@example.com');
    formData.set('message', '');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.message).toBeDefined();
  });

  it('returns rate limit error when rate limited', async () => {
    const { rateLimit } = await import('@/lib/security/rate-limiter');
    vi.mocked(rateLimit).mockReturnValue(false);

    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'john@example.com');
    formData.set('message', 'Hello!');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Too many requests');
  });

  it('creates contact in database with valid data', async () => {
    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'john@example.com');
    formData.set('phone', '555-1234');
    formData.set('message', 'I want a tattoo.');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(true);

    const { db } = await import('@/lib/db');
    expect(db.contact.create).toHaveBeenCalled();
    const callArgs = vi.mocked(db.contact.create).mock.calls[0][0];
    expect(callArgs.data).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      message: 'I want a tattoo.',
    });
  });

  it('sends email notification on valid submission', async () => {
    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'john@example.com');
    formData.set('message', 'I want a tattoo.');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(true);

    // Wait for the non-blocking email send
    await new Promise((resolve) => setTimeout(resolve, 50));

    const { sendContactNotification } = await import('@/lib/email/resend');
    expect(sendContactNotification).toHaveBeenCalled();
    const callArgs = vi.mocked(sendContactNotification).mock.calls[0][0];
    expect(callArgs).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I want a tattoo.',
    });
  });
});
