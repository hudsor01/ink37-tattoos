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

export type ContactFormData = z.infer<typeof ContactFormSchema>;

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

export type UpdateSettingsData = z.infer<typeof UpdateSettingsSchema>;
