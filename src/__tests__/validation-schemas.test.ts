import { describe, it, expect } from 'vitest';
import {
  ContactFormSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  CreateSessionSchema,
  UpdateSettingsSchema,
  RequestDepositSchema,
  RequestBalanceSchema,
  ConsentSignSchema,
  UpdatePortalProfileSchema,
  CreateProductSchema,
  UpdateProductSchema,
  PurchaseGiftCardSchema,
  RedeemGiftCardSchema,
  StoreCheckoutSchema,
  UpdateOrderStatusSchema,
  CalWebhookPayloadSchema,
} from '@/lib/security/validation';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const ISO_DATE = '2025-06-15T10:00:00.000Z';

// ============================================================================
// ContactFormSchema
// ============================================================================
describe('ContactFormSchema', () => {
  const valid = { name: 'John Doe', email: 'john@test.com', message: 'I want a tattoo' };

  it('accepts valid data', () => {
    expect(ContactFormSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional phone', () => {
    expect(ContactFormSchema.safeParse({ ...valid, phone: '555-1234' }).success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = ContactFormSchema.safeParse({ ...valid, name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = ContactFormSchema.safeParse({ ...valid, email: 'not-email' });
    expect(r.success).toBe(false);
  });

  it('rejects empty message', () => {
    const r = ContactFormSchema.safeParse({ ...valid, message: '' });
    expect(r.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const r = ContactFormSchema.safeParse({ ...valid, name: 'x'.repeat(101) });
    expect(r.success).toBe(false);
  });

  it('rejects message over 5000 chars', () => {
    const r = ContactFormSchema.safeParse({ ...valid, message: 'x'.repeat(5001) });
    expect(r.success).toBe(false);
  });
});

// ============================================================================
// CreateCustomerSchema / UpdateCustomerSchema
// ============================================================================
describe('CreateCustomerSchema', () => {
  const valid = { firstName: 'John', lastName: 'Doe' };

  it('accepts minimal valid data (only required fields)', () => {
    expect(CreateCustomerSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full data with all optional fields', () => {
    const full = {
      ...valid,
      email: 'john@test.com',
      phone: '555-1234',
      dateOfBirth: '1990-06-15',
      address: '123 Main St',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'US',
      emergencyName: 'Jane Doe',
      emergencyPhone: '555-5678',
      emergencyRel: 'Spouse',
      allergies: ['latex'],
      medicalConditions: ['diabetes'],
      preferredArtist: 'artist-1',
      notes: 'First time client',
    };
    expect(CreateCustomerSchema.safeParse(full).success).toBe(true);
  });

  it('rejects empty firstName', () => {
    expect(CreateCustomerSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
  });

  it('rejects empty lastName', () => {
    expect(CreateCustomerSchema.safeParse({ ...valid, lastName: '' }).success).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(CreateCustomerSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
  });

  it('rejects invalid dateOfBirth format', () => {
    expect(CreateCustomerSchema.safeParse({ ...valid, dateOfBirth: 'not-a-date' }).success).toBe(false);
  });

  it('defaults allergies to empty array', () => {
    const r = CreateCustomerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.allergies).toEqual([]);
  });
});

describe('UpdateCustomerSchema', () => {
  it('accepts partial data (all fields optional)', () => {
    expect(UpdateCustomerSchema.safeParse({ firstName: 'Jane' }).success).toBe(true);
  });

  it('accepts empty object', () => {
    expect(UpdateCustomerSchema.safeParse({}).success).toBe(true);
  });
});

// ============================================================================
// CreateAppointmentSchema / UpdateAppointmentSchema
// ============================================================================
describe('CreateAppointmentSchema', () => {
  const valid = {
    customerId: UUID,
    scheduledDate: ISO_DATE,
    type: 'TATTOO_SESSION' as const,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
  };

  it('accepts valid data', () => {
    expect(CreateAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects non-UUID customerId', () => {
    expect(CreateAppointmentSchema.safeParse({ ...valid, customerId: 'bad' }).success).toBe(false);
  });

  it('rejects non-datetime scheduledDate', () => {
    expect(CreateAppointmentSchema.safeParse({ ...valid, scheduledDate: '2025-06-15' }).success).toBe(false);
  });

  it('rejects invalid appointment type', () => {
    expect(CreateAppointmentSchema.safeParse({ ...valid, type: 'INVALID' }).success).toBe(false);
  });

  it('accepts all valid appointment types', () => {
    for (const type of ['CONSULTATION', 'DESIGN_REVIEW', 'TATTOO_SESSION', 'TOUCH_UP', 'REMOVAL']) {
      expect(CreateAppointmentSchema.safeParse({ ...valid, type }).success).toBe(true);
    }
  });

  it('rejects negative duration', () => {
    expect(CreateAppointmentSchema.safeParse({ ...valid, duration: -1 }).success).toBe(false);
  });

  it('rejects zero duration', () => {
    expect(CreateAppointmentSchema.safeParse({ ...valid, duration: 0 }).success).toBe(false);
  });
});

describe('UpdateAppointmentSchema', () => {
  it('accepts valid status', () => {
    expect(UpdateAppointmentSchema.safeParse({ status: 'CONFIRMED' }).success).toBe(true);
  });

  it('accepts all valid statuses', () => {
    for (const status of ['PENDING', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']) {
      expect(UpdateAppointmentSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(UpdateAppointmentSchema.safeParse({ status: 'INVALID' }).success).toBe(false);
  });

  it('accepts empty object (all optional)', () => {
    expect(UpdateAppointmentSchema.safeParse({}).success).toBe(true);
  });
});

// ============================================================================
// CreateSessionSchema
// ============================================================================
describe('CreateSessionSchema', () => {
  const valid = {
    customerId: UUID,
    artistId: UUID,
    appointmentDate: ISO_DATE,
    duration: 120,
    designDescription: 'Dragon sleeve',
    placement: 'Left arm',
    size: 'Large',
    style: 'Japanese',
    hourlyRate: 150,
    estimatedHours: 4,
    totalCost: 600,
  };

  it('accepts valid data', () => {
    expect(CreateSessionSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional appointmentId', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, appointmentId: UUID }).success).toBe(true);
  });

  it('rejects non-UUID customerId', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, customerId: 'bad' }).success).toBe(false);
  });

  it('rejects zero duration', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, duration: 0 }).success).toBe(false);
  });

  it('rejects negative hourlyRate', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, hourlyRate: -10 }).success).toBe(false);
  });

  it('rejects zero totalCost', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, totalCost: 0 }).success).toBe(false);
  });

  it('defaults depositAmount to 0', () => {
    const r = CreateSessionSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.depositAmount).toBe(0);
  });

  it('rejects negative depositAmount', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, depositAmount: -50 }).success).toBe(false);
  });

  it('rejects empty designDescription', () => {
    expect(CreateSessionSchema.safeParse({ ...valid, designDescription: '' }).success).toBe(false);
  });
});

// ============================================================================
// UpdateSettingsSchema
// ============================================================================
describe('UpdateSettingsSchema', () => {
  it('accepts valid data', () => {
    expect(UpdateSettingsSchema.safeParse({ key: 'theme', value: 'dark', category: 'ui' }).success).toBe(true);
  });

  it('accepts any value type', () => {
    expect(UpdateSettingsSchema.safeParse({ key: 'k', value: 42, category: 'c' }).success).toBe(true);
    expect(UpdateSettingsSchema.safeParse({ key: 'k', value: true, category: 'c' }).success).toBe(true);
    expect(UpdateSettingsSchema.safeParse({ key: 'k', value: [1, 2], category: 'c' }).success).toBe(true);
  });

  it('rejects empty key', () => {
    expect(UpdateSettingsSchema.safeParse({ key: '', value: 'v', category: 'c' }).success).toBe(false);
  });

  it('rejects empty category', () => {
    expect(UpdateSettingsSchema.safeParse({ key: 'k', value: 'v', category: '' }).success).toBe(false);
  });
});

// ============================================================================
// RequestDepositSchema / RequestBalanceSchema
// ============================================================================
describe('RequestDepositSchema', () => {
  it('accepts valid data', () => {
    expect(RequestDepositSchema.safeParse({ sessionId: UUID, amount: 100 }).success).toBe(true);
  });

  it('rejects non-UUID sessionId', () => {
    const r = RequestDepositSchema.safeParse({ sessionId: 'bad', amount: 100 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Invalid session ID');
  });

  it('rejects zero amount', () => {
    expect(RequestDepositSchema.safeParse({ sessionId: UUID, amount: 0 }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(RequestDepositSchema.safeParse({ sessionId: UUID, amount: -50 }).success).toBe(false);
  });

  it('rejects amount over 50000', () => {
    expect(RequestDepositSchema.safeParse({ sessionId: UUID, amount: 50001 }).success).toBe(false);
  });

  it('accepts max amount 50000', () => {
    expect(RequestDepositSchema.safeParse({ sessionId: UUID, amount: 50000 }).success).toBe(true);
  });
});

describe('RequestBalanceSchema', () => {
  it('accepts valid UUID sessionId', () => {
    expect(RequestBalanceSchema.safeParse({ sessionId: UUID }).success).toBe(true);
  });

  it('rejects non-UUID sessionId', () => {
    expect(RequestBalanceSchema.safeParse({ sessionId: 'sess-1' }).success).toBe(false);
  });
});

// ============================================================================
// ConsentSignSchema
// ============================================================================
describe('ConsentSignSchema', () => {
  const valid = { sessionId: UUID, signedName: 'John Doe', acknowledged: true as const };

  it('accepts valid data', () => {
    expect(ConsentSignSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects non-UUID sessionId', () => {
    const r = ConsentSignSchema.safeParse({ ...valid, sessionId: 'bad' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Invalid session ID');
  });

  it('rejects signedName under 2 chars', () => {
    expect(ConsentSignSchema.safeParse({ ...valid, signedName: 'J' }).success).toBe(false);
  });

  it('rejects signedName over 200 chars', () => {
    expect(ConsentSignSchema.safeParse({ ...valid, signedName: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects acknowledged=false', () => {
    expect(ConsentSignSchema.safeParse({ ...valid, acknowledged: false }).success).toBe(false);
  });

  it('rejects missing acknowledged', () => {
    expect(ConsentSignSchema.safeParse({ sessionId: UUID, signedName: 'John' }).success).toBe(false);
  });
});

// ============================================================================
// UpdatePortalProfileSchema
// ============================================================================
describe('UpdatePortalProfileSchema', () => {
  const valid = { firstName: 'Jane', lastName: 'Smith' };

  it('accepts valid data', () => {
    expect(UpdatePortalProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all optional address fields', () => {
    expect(UpdatePortalProfileSchema.safeParse({
      ...valid,
      phone: '555-1234',
      address: '123 Main St',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'US',
    }).success).toBe(true);
  });

  it('rejects empty firstName', () => {
    expect(UpdatePortalProfileSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
  });

  it('rejects empty lastName', () => {
    expect(UpdatePortalProfileSchema.safeParse({ ...valid, lastName: '' }).success).toBe(false);
  });

  it('does NOT include medical fields (D-04)', () => {
    const r = UpdatePortalProfileSchema.safeParse({ ...valid, allergies: ['latex'] });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).allergies).toBeUndefined();
  });
});

// ============================================================================
// CreateProductSchema / UpdateProductSchema
// ============================================================================
describe('CreateProductSchema', () => {
  const valid = { name: 'Flash Print', price: 25, productType: 'PHYSICAL' as const };

  it('accepts valid data', () => {
    expect(CreateProductSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all product types', () => {
    for (const productType of ['PHYSICAL', 'DIGITAL', 'GIFT_CARD']) {
      expect(CreateProductSchema.safeParse({ ...valid, productType }).success).toBe(true);
    }
  });

  it('rejects empty name', () => {
    expect(CreateProductSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    expect(CreateProductSchema.safeParse({ ...valid, name: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects zero price', () => {
    expect(CreateProductSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
  });

  it('rejects price over 50000', () => {
    expect(CreateProductSchema.safeParse({ ...valid, price: 50001 }).success).toBe(false);
  });

  it('rejects invalid productType', () => {
    expect(CreateProductSchema.safeParse({ ...valid, productType: 'INVALID' }).success).toBe(false);
  });

  it('defaults isActive to true', () => {
    const r = CreateProductSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isActive).toBe(true);
  });

  it('defaults sortOrder to 0', () => {
    const r = CreateProductSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sortOrder).toBe(0);
  });

  it('rejects invalid imageUrl', () => {
    expect(CreateProductSchema.safeParse({ ...valid, imageUrl: 'not-a-url' }).success).toBe(false);
  });
});

describe('UpdateProductSchema', () => {
  it('requires id (UUID)', () => {
    expect(UpdateProductSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it('rejects non-UUID id', () => {
    expect(UpdateProductSchema.safeParse({ id: 'bad' }).success).toBe(false);
  });

  it('accepts partial fields alongside id', () => {
    expect(UpdateProductSchema.safeParse({ id: UUID, name: 'New Name' }).success).toBe(true);
  });
});

// ============================================================================
// PurchaseGiftCardSchema
// ============================================================================
describe('PurchaseGiftCardSchema', () => {
  const valid = {
    denomination: '50' as const,
    recipientName: 'Alice',
    recipientEmail: 'alice@test.com',
    senderName: 'Bob',
  };

  it('accepts valid data', () => {
    expect(PurchaseGiftCardSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all denominations', () => {
    for (const denomination of ['25', '50', '100', '200', '500']) {
      expect(PurchaseGiftCardSchema.safeParse({ ...valid, denomination }).success).toBe(true);
    }
  });

  it('rejects invalid denomination', () => {
    expect(PurchaseGiftCardSchema.safeParse({ ...valid, denomination: '75' }).success).toBe(false);
  });

  it('rejects numeric denomination (must be string)', () => {
    expect(PurchaseGiftCardSchema.safeParse({ ...valid, denomination: 50 }).success).toBe(false);
  });

  it('rejects invalid recipientEmail', () => {
    expect(PurchaseGiftCardSchema.safeParse({ ...valid, recipientEmail: 'bad' }).success).toBe(false);
  });

  it('accepts optional personalMessage', () => {
    expect(PurchaseGiftCardSchema.safeParse({ ...valid, personalMessage: 'Happy birthday!' }).success).toBe(true);
  });

  it('rejects personalMessage over 500 chars', () => {
    expect(PurchaseGiftCardSchema.safeParse({ ...valid, personalMessage: 'x'.repeat(501) }).success).toBe(false);
  });
});

// ============================================================================
// RedeemGiftCardSchema
// ============================================================================
describe('RedeemGiftCardSchema', () => {
  it('accepts valid INK37 code format', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: 'INK37-ABCD-EFGH-IJKL' }).success).toBe(true);
  });

  it('accepts codes with digits 2-9', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: 'INK37-A2B3-C4D5-E6F7' }).success).toBe(true);
  });

  it('rejects empty code', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: '' }).success).toBe(false);
  });

  it('rejects wrong prefix', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: 'GIFT-ABCD-EFGH-IJKL' }).success).toBe(false);
  });

  it('rejects lowercase letters', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: 'INK37-abcd-efgh-ijkl' }).success).toBe(false);
  });

  it('rejects codes with 0 or 1 (ambiguous chars)', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: 'INK37-A0B1-CDEF-GHIJ' }).success).toBe(false);
  });

  it('rejects wrong segment length', () => {
    expect(RedeemGiftCardSchema.safeParse({ code: 'INK37-ABC-DEFG-HIJK' }).success).toBe(false);
  });
});

// ============================================================================
// StoreCheckoutSchema
// ============================================================================
describe('StoreCheckoutSchema', () => {
  const valid = { items: [{ productId: UUID, quantity: 1 }] };

  it('accepts valid data', () => {
    expect(StoreCheckoutSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts multiple items', () => {
    const r = StoreCheckoutSchema.safeParse({
      items: [
        { productId: UUID, quantity: 2 },
        { productId: '660e8400-e29b-41d4-a716-446655440001', quantity: 1 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty cart', () => {
    expect(StoreCheckoutSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it('rejects non-UUID productId', () => {
    expect(StoreCheckoutSchema.safeParse({ items: [{ productId: 'bad', quantity: 1 }] }).success).toBe(false);
  });

  it('rejects zero quantity', () => {
    expect(StoreCheckoutSchema.safeParse({ items: [{ productId: UUID, quantity: 0 }] }).success).toBe(false);
  });

  it('rejects quantity over 10', () => {
    expect(StoreCheckoutSchema.safeParse({ items: [{ productId: UUID, quantity: 11 }] }).success).toBe(false);
  });

  it('accepts optional giftCardCode', () => {
    expect(StoreCheckoutSchema.safeParse({ ...valid, giftCardCode: 'INK37-ABCD-EFGH-IJKL' }).success).toBe(true);
  });
});

// ============================================================================
// UpdateOrderStatusSchema
// ============================================================================
describe('UpdateOrderStatusSchema', () => {
  it('accepts valid data', () => {
    expect(UpdateOrderStatusSchema.safeParse({ orderId: UUID, status: 'SHIPPED' }).success).toBe(true);
  });

  it('accepts all valid statuses', () => {
    for (const status of ['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']) {
      expect(UpdateOrderStatusSchema.safeParse({ orderId: UUID, status }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(UpdateOrderStatusSchema.safeParse({ orderId: UUID, status: 'PENDING' }).success).toBe(false);
  });

  it('rejects non-UUID orderId', () => {
    expect(UpdateOrderStatusSchema.safeParse({ orderId: 'bad', status: 'PAID' }).success).toBe(false);
  });

  it('accepts optional notes', () => {
    expect(UpdateOrderStatusSchema.safeParse({ orderId: UUID, status: 'SHIPPED', notes: 'Tracking: 123' }).success).toBe(true);
  });

  it('rejects notes over 1000 chars', () => {
    expect(UpdateOrderStatusSchema.safeParse({ orderId: UUID, status: 'SHIPPED', notes: 'x'.repeat(1001) }).success).toBe(false);
  });
});

// ============================================================================
// CalWebhookPayloadSchema
// ============================================================================
describe('CalWebhookPayloadSchema', () => {
  const valid = {
    triggerEvent: 'BOOKING_CREATED' as const,
    createdAt: ISO_DATE,
    payload: {
      uid: 'cal-uid-123',
      bookingId: 1,
      eventTypeId: 1,
      startTime: ISO_DATE,
      endTime: '2025-06-15T12:00:00.000Z',
      length: 120,
      attendees: [{
        name: 'John',
        email: 'john@test.com',
        timeZone: 'America/Los_Angeles',
        language: { locale: 'en' },
      }],
    },
  };

  it('accepts valid BOOKING_CREATED event', () => {
    expect(CalWebhookPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all trigger events', () => {
    for (const triggerEvent of ['BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED']) {
      expect(CalWebhookPayloadSchema.safeParse({ ...valid, triggerEvent }).success).toBe(true);
    }
  });

  it('rejects invalid trigger event', () => {
    expect(CalWebhookPayloadSchema.safeParse({ ...valid, triggerEvent: 'INVALID' }).success).toBe(false);
  });

  it('rejects empty attendees array', () => {
    expect(CalWebhookPayloadSchema.safeParse({
      ...valid,
      payload: { ...valid.payload, attendees: [] },
    }).success).toBe(false);
  });

  it('rejects attendee with invalid email', () => {
    expect(CalWebhookPayloadSchema.safeParse({
      ...valid,
      payload: {
        ...valid.payload,
        attendees: [{ ...valid.payload.attendees[0], email: 'bad' }],
      },
    }).success).toBe(false);
  });

  it('rejects empty uid', () => {
    expect(CalWebhookPayloadSchema.safeParse({
      ...valid,
      payload: { ...valid.payload, uid: '' },
    }).success).toBe(false);
  });

  it('accepts optional responses and metadata', () => {
    expect(CalWebhookPayloadSchema.safeParse({
      ...valid,
      payload: {
        ...valid.payload,
        responses: { phone: { value: '555-1234' } },
        metadata: { source: 'website' },
        rescheduleUid: 'old-uid',
        cancellationReason: 'Changed plans',
      },
    }).success).toBe(true);
  });

  it('allows passthrough on payload (extra fields preserved)', () => {
    const r = CalWebhookPayloadSchema.safeParse({
      ...valid,
      payload: { ...valid.payload, customField: 'extra' },
    });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data.payload as Record<string, unknown>).customField).toBe('extra');
  });
});
