import { z } from 'zod';

// ============================================================================
// CONTACT FORM
// ============================================================================

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(5000),
});


// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

export const CreateCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRel: z.string().optional(),
  allergies: z.array(z.string()).optional().default([]),
  medicalConditions: z.array(z.string()).optional().default([]),
  preferredArtist: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCustomerData = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export type UpdateCustomerData = z.infer<typeof UpdateCustomerSchema>;

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

export const CreateAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  scheduledDate: z.string().datetime(),
  duration: z.number().int().positive().optional(),
  type: z.enum([
    'CONSULTATION',
    'DESIGN_REVIEW',
    'TATTOO_SESSION',
    'TOUCH_UP',
    'REMOVAL',
  ]),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email(),
  phone: z.string().optional(),
  tattooType: z.string().optional(),
  size: z.string().optional(),
  placement: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateAppointmentData = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ])
    .optional(),
  scheduledDate: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export type UpdateAppointmentData = z.infer<typeof UpdateAppointmentSchema>;

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const CreateSessionSchema = z.object({
  customerId: z.string().uuid(),
  artistId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  appointmentDate: z.string().datetime(),
  duration: z.number().int().positive(),
  designDescription: z.string().min(1, 'Design description is required'),
  placement: z.string().min(1, 'Placement is required'),
  size: z.string().min(1, 'Size is required'),
  style: z.string().min(1, 'Style is required'),
  hourlyRate: z.number().positive(),
  estimatedHours: z.number().positive(),
  depositAmount: z.number().nonnegative().optional().default(0),
  totalCost: z.number().positive(),
  notes: z.string().optional(),
});

export type CreateSessionData = z.infer<typeof CreateSessionSchema>;

// ============================================================================
// SETTINGS
// ============================================================================

export const UpdateSettingsSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.unknown(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
});


// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

export const RequestDepositSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  amount: z.number().positive('Amount must be positive').max(50000, 'Amount exceeds maximum'),
});


export const RequestBalanceSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});


// ============================================================================
// PORTAL: CONSENT SIGNING (D-06, D-07)
// ============================================================================

export const ConsentSignSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  signedName: z.string().min(2, 'Please type your full name').max(200),
  acknowledged: z.literal(true, {
    message: 'You must acknowledge the consent terms',
  }),
});


// ============================================================================
// PORTAL: PROFILE UPDATE (D-04 -- no medical fields)
// ============================================================================

export const UpdatePortalProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});


// ============================================================================
// STORE: PRODUCT MANAGEMENT (D-01, D-02)
// ============================================================================

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive('Price must be positive').max(50000),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'GIFT_CARD']),
  imageUrl: z.string().url().optional(),
  digitalFilePathname: z.string().optional(),
  digitalFileName: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

export type CreateProductData = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateProductData = z.infer<typeof UpdateProductSchema>;

// ============================================================================
// STORE: GIFT CARD PURCHASE (D-10, D-11, D-13)
// ============================================================================

export const PurchaseGiftCardSchema = z.object({
  denomination: z.enum(['25', '50', '100', '200', '500'], {
    message: 'Please select a denomination',
  }),
  recipientName: z.string().min(1, 'Recipient name is required').max(100),
  recipientEmail: z.string().email('Invalid recipient email'),
  senderName: z.string().min(1, 'Your name is required').max(100),
  personalMessage: z.string().max(500).optional(),
});


// ============================================================================
// STORE: GIFT CARD REDEMPTION (D-09, D-14)
// ============================================================================

export const RedeemGiftCardSchema = z.object({
  code: z
    .string()
    .min(1, 'Gift card code is required')
    .regex(
      /^INK37-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/,
      'Invalid gift card code format. Expected: INK37-XXXX-XXXX-XXXX'
    ),
});


// ============================================================================
// STORE: CHECKOUT (D-05, D-06, D-08)
// ============================================================================

export const StoreCheckoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive().max(10),
    })
  ).min(1, 'Cart cannot be empty'),
  giftCardCode: z.string().optional(),
});


// ============================================================================
// STORE: ORDER MANAGEMENT (D-19, D-20)
// ============================================================================

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  notes: z.string().max(1000).optional(),
});


// ============================================================================
// CAL.COM WEBHOOK
// ============================================================================

export const CalWebhookPayloadSchema = z.object({
  triggerEvent: z.enum(['BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CANCELLED']),
  createdAt: z.string(),
  payload: z.object({
    uid: z.string().min(1),
    bookingId: z.number(),
    eventTypeId: z.number(),
    startTime: z.string(),
    endTime: z.string(),
    length: z.number(),
    attendees: z.array(z.object({
      name: z.string(),
      email: z.string().email(),
      timeZone: z.string(),
      language: z.object({ locale: z.string() }),
    })).min(1),
    responses: z.object({
      phone: z.object({ value: z.string() }).optional(),
    }).passthrough().optional(),
    metadata: z.record(z.unknown()).optional(),
    videoCallData: z.object({ url: z.string().optional() }).optional(),
    rescheduleUid: z.string().optional(),
    cancellationReason: z.string().optional(),
  }).passthrough(),
});

