import { describe, it, expect } from 'vitest';
import {
  ContactFormSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  CreateSessionSchema,
  UpdateSettingsSchema,
} from '@/lib/security/validation';

describe('ContactFormSchema', () => {
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
  });

  it('rejects invalid email', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John',
      email: 'not-an-email',
      message: 'Hello!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty message', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      message: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects message over 5000 characters', () => {
    const result = ContactFormSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      message: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateCustomerSchema', () => {
  it('validates valid customer data', () => {
    const result = CreateCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result.success).toBe(true);
  });

  it('validates with all optional fields', () => {
    const result = CreateCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      allergies: ['latex'],
      medicalConditions: ['diabetes'],
      notes: 'Prefers morning appointments',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty firstName', () => {
    const result = CreateCustomerSchema.safeParse({
      firstName: '',
      lastName: 'Doe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty lastName', () => {
    const result = CreateCustomerSchema.safeParse({
      firstName: 'John',
      lastName: '',
    });
    expect(result.success).toBe(false);
  });

  it('defaults allergies to empty array', () => {
    const result = CreateCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allergies).toEqual([]);
    }
  });
});

describe('UpdateCustomerSchema', () => {
  it('validates partial updates', () => {
    const result = UpdateCustomerSchema.safeParse({
      firstName: 'Jane',
    });
    expect(result.success).toBe(true);
  });

  it('validates empty object (no changes)', () => {
    const result = UpdateCustomerSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('CreateAppointmentSchema', () => {
  it('validates valid appointment data', () => {
    const result = CreateAppointmentSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      scheduledDate: '2026-04-01T10:00:00.000Z',
      type: 'CONSULTATION',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid appointment type', () => {
    const result = CreateAppointmentSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      scheduledDate: '2026-04-01T10:00:00.000Z',
      type: 'INVALID_TYPE',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required date', () => {
    const result = CreateAppointmentSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'CONSULTATION',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid customerId (not UUID)', () => {
    const result = CreateAppointmentSchema.safeParse({
      customerId: 'not-a-uuid',
      scheduledDate: '2026-04-01T10:00:00.000Z',
      type: 'CONSULTATION',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateAppointmentSchema', () => {
  it('validates status update', () => {
    const result = UpdateAppointmentSchema.safeParse({
      status: 'CONFIRMED',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = UpdateAppointmentSchema.safeParse({
      status: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateSessionSchema', () => {
  it('validates valid session data', () => {
    const result = CreateSessionSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440000',
      appointmentDate: '2026-04-01T10:00:00.000Z',
      duration: 120,
      designDescription: 'Dragon sleeve',
      placement: 'Left arm',
      size: 'Large',
      style: 'Japanese',
      hourlyRate: 150,
      estimatedHours: 8,
      totalCost: 1200,
    });
    expect(result.success).toBe(true);
  });

  it('validates with optional deposit', () => {
    const result = CreateSessionSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440000',
      appointmentDate: '2026-04-01T10:00:00.000Z',
      duration: 120,
      designDescription: 'Dragon sleeve',
      placement: 'Left arm',
      size: 'Large',
      style: 'Japanese',
      hourlyRate: 150,
      estimatedHours: 8,
      depositAmount: 200,
      totalCost: 1200,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositAmount).toBe(200);
    }
  });

  it('defaults depositAmount to 0', () => {
    const result = CreateSessionSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440000',
      appointmentDate: '2026-04-01T10:00:00.000Z',
      duration: 120,
      designDescription: 'Dragon sleeve',
      placement: 'Left arm',
      size: 'Large',
      style: 'Japanese',
      hourlyRate: 150,
      estimatedHours: 8,
      totalCost: 1200,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositAmount).toBe(0);
    }
  });

  it('rejects negative hourlyRate', () => {
    const result = CreateSessionSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440000',
      appointmentDate: '2026-04-01T10:00:00.000Z',
      duration: 120,
      designDescription: 'Dragon sleeve',
      placement: 'Left arm',
      size: 'Large',
      style: 'Japanese',
      hourlyRate: -10,
      estimatedHours: 8,
      totalCost: 1200,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero totalCost', () => {
    const result = CreateSessionSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440000',
      appointmentDate: '2026-04-01T10:00:00.000Z',
      duration: 120,
      designDescription: 'Dragon sleeve',
      placement: 'Left arm',
      size: 'Large',
      style: 'Japanese',
      hourlyRate: 150,
      estimatedHours: 8,
      totalCost: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty designDescription', () => {
    const result = CreateSessionSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440000',
      appointmentDate: '2026-04-01T10:00:00.000Z',
      duration: 120,
      designDescription: '',
      placement: 'Left arm',
      size: 'Large',
      style: 'Japanese',
      hourlyRate: 150,
      estimatedHours: 8,
      totalCost: 1200,
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateSettingsSchema', () => {
  it('validates valid settings update', () => {
    const result = UpdateSettingsSchema.safeParse({
      key: 'theme',
      value: 'dark',
      category: 'appearance',
    });
    expect(result.success).toBe(true);
  });

  it('validates with complex value', () => {
    const result = UpdateSettingsSchema.safeParse({
      key: 'notification_prefs',
      value: { email: true, sms: false },
      category: 'notifications',
      description: 'User notification preferences',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty key', () => {
    const result = UpdateSettingsSchema.safeParse({
      key: '',
      value: 'test',
      category: 'general',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = UpdateSettingsSchema.safeParse({
      key: 'test',
      value: 'test',
      category: '',
    });
    expect(result.success).toBe(false);
  });
});
