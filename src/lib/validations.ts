/**
 * Centralized validation schema barrel export.
 *
 * All Zod schemas live in their canonical location at @/lib/security/validation.
 * This file re-exports them so consumers can do:
 *
 *   import { CreateCustomerSchema, ContactFormSchema } from '@/lib/validations';
 *
 * Existing imports from @/lib/security/validation continue to work.
 */

// ============================================================================
// Contact Form
// ============================================================================

/** Public contact form submission (name, email, phone, message) */
export { ContactFormSchema } from '@/lib/security/validation';

// ============================================================================
// Customer Management
// ============================================================================

/** Create a new customer record */
export { CreateCustomerSchema } from '@/lib/security/validation';
export type { CreateCustomerData } from '@/lib/security/validation';

/** Partial update of an existing customer */
export { UpdateCustomerSchema } from '@/lib/security/validation';
export type { UpdateCustomerData } from '@/lib/security/validation';

// ============================================================================
// Appointment Management
// ============================================================================

/** Schedule a new appointment */
export { CreateAppointmentSchema } from '@/lib/security/validation';
export type { CreateAppointmentData } from '@/lib/security/validation';

/** Update appointment status, date, duration, or notes */
export { UpdateAppointmentSchema } from '@/lib/security/validation';
export type { UpdateAppointmentData } from '@/lib/security/validation';

// ============================================================================
// Session Management
// ============================================================================

/** Create a new tattoo session */
export { CreateSessionSchema } from '@/lib/security/validation';
export type { CreateSessionData } from '@/lib/security/validation';

// ============================================================================
// Settings
// ============================================================================

/** Upsert a settings key/value pair */
export { UpdateSettingsSchema } from '@/lib/security/validation';

// ============================================================================
// Payment Management
// ============================================================================

/** Request a deposit payment for a tattoo session */
export { RequestDepositSchema } from '@/lib/security/validation';

/** Request a balance payment for a tattoo session */
export { RequestBalanceSchema } from '@/lib/security/validation';

// ============================================================================
// Consent Forms
// ============================================================================

/** Create or update a consent form template */
export { ConsentFormSchema } from '@/lib/security/validation';
export type { ConsentFormData } from '@/lib/security/validation';

/** Sign a consent form for a session */
export { ConsentSignSchema } from '@/lib/security/validation';

// ============================================================================
// Portal
// ============================================================================

/** Update client portal profile (no medical fields) */
export { UpdatePortalProfileSchema } from '@/lib/security/validation';

// ============================================================================
// Store: Products
// ============================================================================

/** Create a new product listing */
export { CreateProductSchema } from '@/lib/security/validation';
export type { CreateProductData } from '@/lib/security/validation';

/** Update an existing product */
export { UpdateProductSchema } from '@/lib/security/validation';
export type { UpdateProductData } from '@/lib/security/validation';

// ============================================================================
// Store: Gift Cards
// ============================================================================

/** Purchase a gift card */
export { PurchaseGiftCardSchema } from '@/lib/security/validation';

/** Redeem a gift card by code */
export { RedeemGiftCardSchema } from '@/lib/security/validation';

// ============================================================================
// Store: Checkout & Orders
// ============================================================================

/** Checkout with cart items and optional gift card */
export { StoreCheckoutSchema } from '@/lib/security/validation';

/** Update order fulfillment status */
export { UpdateOrderStatusSchema } from '@/lib/security/validation';

// ============================================================================
// Webhooks
// ============================================================================

/** Cal.com booking webhook payload */
export { CalWebhookPayloadSchema } from '@/lib/security/validation';
