import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContactFormSchema } from '@/lib/security/validation';

// Mock server-only module
vi.mock('server-only', () => ({}));

// Mock the DAL contacts module (Drizzle-based)
const mockCreateContact = vi.fn().mockResolvedValue({
  id: 'test-id',
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Hello',
  status: 'NEW',
  createdAt: new Date(),
  updatedAt: new Date(),
});

vi.mock('@/lib/dal/contacts', () => ({
  createContact: (...args: unknown[]) => mockCreateContact(...args),
}));

// Mock the email module
const mockSendContactNotification = vi.fn().mockResolvedValue({
  adminSent: true,
  customerSent: true,
});

vi.mock('@/lib/email/resend', () => ({
  sendContactNotification: (...args: unknown[]) => mockSendContactNotification(...args),
}));

// Mock the rate limiter (new Upstash-backed API)
const mockRateLimitResult = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
const mockRateLimit = vi.fn().mockReturnValue(true);

vi.mock('@/lib/security/rate-limiter', () => ({
  rateLimiters: {
    contact: { limit: (...args: unknown[]) => mockRateLimitResult(...args) },
  },
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  getHeaderIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRequestIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn().mockReturnValue(Response.json({ error: 'Too many requests' }, { status: 429 })),
}));

// Mock next/headers
const mockHeadersGet = vi.fn().mockReturnValue('127.0.0.1');

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockHeadersGet(...args),
  }),
}));

// Mock next/server after()
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

// Mock audit logging
vi.mock('@/lib/dal/audit', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
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
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-establish default mock return values after clearing
    mockRateLimitResult.mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    mockRateLimit.mockReturnValue(true);
    mockHeadersGet.mockReturnValue('127.0.0.1');
    mockCreateContact.mockResolvedValue({
      id: 'test-id',
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello',
      status: 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockSendContactNotification.mockResolvedValue({
      adminSent: true,
      customerSent: true,
    });
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
    if (!result.success) {
      expect((result as { errors?: Record<string, string[]> }).errors).toBeDefined();
      expect((result as { errors?: Record<string, string[]> }).errors?.email).toBeDefined();
    }
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
    if (!result.success) {
      expect((result as { errors?: Record<string, string[]> }).errors).toBeDefined();
      expect((result as { errors?: Record<string, string[]> }).errors?.name).toBeDefined();
    }
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
    if (!result.success) {
      expect((result as { errors?: Record<string, string[]> }).errors).toBeDefined();
      expect((result as { errors?: Record<string, string[]> }).errors?.message).toBeDefined();
    }
  });

  it('returns rate limit error when rate limited', async () => {
    mockRateLimit.mockReturnValue(false);
    mockRateLimitResult.mockResolvedValue({ success: false, reset: Date.now() + 60000 });

    const { submitContactForm } = await import(
      '@/lib/actions/contact-actions'
    );

    const formData = new FormData();
    formData.set('name', 'John Doe');
    formData.set('email', 'john@example.com');
    formData.set('message', 'Hello!');

    const result = await submitContactForm(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Too many');
    }
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

    expect(mockCreateContact).toHaveBeenCalled();
    expect(mockCreateContact).toHaveBeenCalledWith({
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

    expect(mockSendContactNotification).toHaveBeenCalled();
    expect(mockSendContactNotification.mock.calls[0][0]).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'I want a tattoo.',
    });
  });
});
