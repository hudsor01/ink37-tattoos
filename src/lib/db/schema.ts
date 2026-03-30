import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const productTypeEnum = pgEnum('ProductType', ['PHYSICAL', 'DIGITAL', 'GIFT_CARD']);
export const orderStatusEnum = pgEnum('OrderStatus', ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']);
export const appointmentStatusEnum = pgEnum('AppointmentStatus', ['PENDING', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
export const appointmentTypeEnum = pgEnum('AppointmentType', ['CONSULTATION', 'DESIGN_REVIEW', 'TATTOO_SESSION', 'TOUCH_UP', 'REMOVAL']);
export const sessionStatusEnum = pgEnum('SessionStatus', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
export const contactStatusEnum = pgEnum('ContactStatus', ['NEW', 'READ', 'REPLIED', 'RESOLVED']);
export const paymentTypeEnum = pgEnum('PaymentType', ['DEPOSIT', 'SESSION_BALANCE', 'REFUND']);
export const paymentStatusEnum = pgEnum('PaymentStatus', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']);

// ============================================================================
// AUTH MODELS (managed by Better Auth via raw pg.Pool)
// ============================================================================

export const user = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  banReason: text('banReason'),
  banExpires: timestamp('banExpires'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('user_email_idx').on(table.email),
  index('user_role_idx').on(table.role),
]);

export const session = pgTable('session', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  impersonatedBy: text('impersonatedBy'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('session_userId_idx').on(table.userId),
  index('session_token_idx').on(table.token),
  index('session_expiresAt_idx').on(table.expiresAt),
]);

export const account = pgTable('account', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  type: text('type').notNull().default('credential'),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('account_providerId_accountId_key').on(table.providerId, table.accountId),
  index('account_userId_idx').on(table.userId),
]);

export const verification = pgTable('verification', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex('verification_identifier_value_key').on(table.identifier, table.value),
  index('verification_identifier_idx').on(table.identifier),
  index('verification_expiresAt_idx').on(table.expiresAt),
]);

// ============================================================================
// DOMAIN MODELS
// ============================================================================

export const customer = pgTable('customer', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  email: text('email').unique(),
  phone: text('phone'),
  userId: uuid('userId').unique().references(() => user.id),
  dateOfBirth: timestamp('dateOfBirth'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postalCode'),
  country: text('country'),
  emergencyName: text('emergencyName'),
  emergencyPhone: text('emergencyPhone'),
  emergencyRel: text('emergencyRel'),
  allergies: text('allergies').array(),
  medicalConditions: text('medicalConditions').array(),
  preferredArtist: text('preferredArtist'),
  notes: text('notes'),
  stripeCustomerId: text('stripeCustomerId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('customer_email_idx').on(table.email),
  index('customer_phone_idx').on(table.phone),
  index('customer_firstName_lastName_idx').on(table.firstName, table.lastName),
  index('customer_createdAt_idx').on(table.createdAt),
]);

export const tattooArtist = pgTable('tattoo_artist', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  specialties: text('specialties').array(),
  hourlyRate: numeric('hourlyRate', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  isActive: boolean('isActive').notNull().default(true),
  portfolio: text('portfolio').array(),
  bio: text('bio'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const appointment = pgTable('appointment', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customerId').notNull().references(() => customer.id),
  artistId: uuid('artistId').references(() => tattooArtist.id),
  scheduledDate: timestamp('scheduledDate').notNull(),
  duration: integer('duration'),
  status: appointmentStatusEnum('status').notNull().default('PENDING'),
  type: appointmentTypeEnum('type').notNull().default('CONSULTATION'),
  calBookingUid: text('calBookingUid').unique(),
  calEventTypeId: integer('calEventTypeId'),
  calStatus: text('calStatus'),
  calMeetingUrl: text('calMeetingUrl'),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  tattooType: text('tattooType'),
  size: text('size'),
  placement: text('placement'),
  description: text('description'),
  source: text('source').notNull().default('website'),
  notes: text('notes'),
  reminderSent: boolean('reminderSent').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('appointment_scheduledDate_idx').on(table.scheduledDate),
  index('appointment_status_idx').on(table.status),
  index('appointment_email_idx').on(table.email),
  index('appointment_customerId_scheduledDate_idx').on(table.customerId, table.scheduledDate),
  index('appointment_scheduledDate_status_idx').on(table.scheduledDate, table.status),
  index('appointment_createdAt_idx').on(table.createdAt),
]);

export const tattooSession = pgTable('tattoo_session', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customerId').notNull().references(() => customer.id),
  artistId: uuid('artistId').notNull().references(() => tattooArtist.id),
  appointmentId: uuid('appointmentId').unique().references(() => appointment.id),
  appointmentDate: timestamp('appointmentDate').notNull(),
  duration: integer('duration').notNull(),
  status: sessionStatusEnum('status').notNull().default('SCHEDULED'),
  designDescription: text('designDescription').notNull(),
  placement: text('placement').notNull(),
  size: text('size').notNull(),
  style: text('style').notNull(),
  referenceImages: text('referenceImages').array(),
  hourlyRate: numeric('hourlyRate', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  estimatedHours: numeric('estimatedHours', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  depositAmount: numeric('depositAmount', { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  totalCost: numeric('totalCost', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  paidAmount: numeric('paidAmount', { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  notes: text('notes'),
  aftercareProvided: boolean('aftercareProvided').notNull().default(false),
  consentSigned: boolean('consentSigned').notNull().default(false),
  consentSignedAt: timestamp('consentSignedAt'),
  consentSignedBy: text('consentSignedBy'),
  consentFormVersion: integer('consentFormVersion'),
  consentExpiresAt: timestamp('consentExpiresAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('tattoo_session_appointmentDate_idx').on(table.appointmentDate),
  index('tattoo_session_status_idx').on(table.status),
  index('tattoo_session_appointmentDate_status_idx').on(table.appointmentDate, table.status),
  index('tattoo_session_appointmentDate_totalCost_idx').on(table.appointmentDate, table.totalCost),
]);

export const tattooDesign = pgTable('tattoo_design', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  fileUrl: text('fileUrl').notNull(),
  thumbnailUrl: text('thumbnailUrl'),
  designType: text('designType'),
  size: text('size'),
  style: text('style'),
  tags: text('tags').array(),
  isApproved: boolean('isApproved').notNull().default(false),
  isPublic: boolean('isPublic').notNull().default(true),
  estimatedHours: numeric('estimatedHours', { precision: 10, scale: 2, mode: 'number' }),
  popularity: integer('popularity').notNull().default(0),
  artistId: uuid('artistId').notNull().references(() => tattooArtist.id),
  customerId: uuid('customerId').references(() => customer.id),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('tattoo_design_isApproved_idx').on(table.isApproved),
  index('tattoo_design_designType_idx').on(table.designType),
  index('tattoo_design_artistId_idx').on(table.artistId),
  index('tattoo_design_createdAt_idx').on(table.createdAt),
  index('tattoo_design_isApproved_createdAt_idx').on(table.isApproved, table.createdAt),
]);

export const contact = pgTable('contact', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  status: contactStatusEnum('status').notNull().default('NEW'),
  adminNotes: text('adminNotes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('contact_email_idx').on(table.email),
  index('contact_status_idx').on(table.status),
  index('contact_createdAt_idx').on(table.createdAt),
]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').references(() => user.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resourceId'),
  ip: text('ip').notNull(),
  userAgent: text('userAgent').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  metadata: jsonb('metadata'),
}, (table) => [
  index('audit_log_action_idx').on(table.action),
  index('audit_log_resource_idx').on(table.resource),
  index('audit_log_timestamp_idx').on(table.timestamp),
  index('audit_log_userId_idx').on(table.userId),
]);

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  isEnvironment: boolean('isEnvironment').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('settings_category_idx').on(table.category),
  index('settings_key_idx').on(table.key),
]);

export const consentForm = pgTable('consent_form', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull(),
  title: text('title').notNull().default('Tattoo Consent Form'),
  content: text('content').notNull(),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================================
// PAYMENT MODELS
// ============================================================================

export const payment = pgTable('payment', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customerId').notNull().references(() => customer.id),
  tattooSessionId: uuid('tattooSessionId').notNull().references(() => tattooSession.id),
  type: paymentTypeEnum('type').notNull(),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  amount: numeric('amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  stripeCheckoutSessionId: text('stripeCheckoutSessionId'),
  stripePaymentIntentId: text('stripePaymentIntentId'),
  receiptUrl: text('receiptUrl'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
  completedAt: timestamp('completedAt'),
}, (table) => [
  index('payment_customerId_idx').on(table.customerId),
  index('payment_tattooSessionId_idx').on(table.tattooSessionId),
  index('payment_status_idx').on(table.status),
  index('payment_type_idx').on(table.type),
  index('payment_createdAt_idx').on(table.createdAt),
  index('payment_stripePaymentIntentId_idx').on(table.stripePaymentIntentId),
]);

export const stripeEvent = pgTable('stripe_event', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: text('stripeEventId').notNull().unique(),
  type: text('type').notNull(),
  processedAt: timestamp('processedAt').notNull().defaultNow(),
}, (table) => [
  index('stripe_event_stripeEventId_idx').on(table.stripeEventId),
]);

// ============================================================================
// STORE MODELS
// ============================================================================

export const product = pgTable('product', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  productType: productTypeEnum('productType').notNull(),
  imageUrl: text('imageUrl'),
  digitalFilePathname: text('digitalFilePathname'),
  digitalFileName: text('digitalFileName'),
  stripeProductId: text('stripeProductId').unique(),
  stripePriceId: text('stripePriceId').unique(),
  isActive: boolean('isActive').notNull().default(true),
  sortOrder: integer('sortOrder').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('product_productType_idx').on(table.productType),
  index('product_isActive_idx').on(table.isActive),
  index('product_isActive_productType_idx').on(table.isActive, table.productType),
]);

export const order = pgTable('order', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  shippingAmount: numeric('shippingAmount', { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  discountAmount: numeric('discountAmount', { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  total: numeric('total', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  stripeCheckoutSessionId: text('stripeCheckoutSessionId').unique(),
  stripePaymentIntentId: text('stripePaymentIntentId'),
  shippingName: text('shippingName'),
  shippingAddress: text('shippingAddress'),
  shippingCity: text('shippingCity'),
  shippingState: text('shippingState'),
  shippingPostalCode: text('shippingPostalCode'),
  shippingCountry: text('shippingCountry'),
  giftCardCode: text('giftCardCode'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('order_email_idx').on(table.email),
  index('order_status_idx').on(table.status),
  index('order_createdAt_idx').on(table.createdAt),
  index('order_stripeCheckoutSessionId_idx').on(table.stripeCheckoutSessionId),
]);

export const orderItem = pgTable('order_item', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('orderId').notNull().references(() => order.id, { onDelete: 'cascade' }),
  productId: uuid('productId').notNull().references(() => product.id),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  totalPrice: numeric('totalPrice', { precision: 10, scale: 2, mode: 'number' }).notNull(),
}, (table) => [
  index('order_item_orderId_idx').on(table.orderId),
  index('order_item_productId_idx').on(table.productId),
]);

export const giftCard = pgTable('gift_card', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  initialBalance: numeric('initialBalance', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  balance: numeric('balance', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  purchaserEmail: text('purchaserEmail').notNull(),
  recipientEmail: text('recipientEmail').notNull(),
  recipientName: text('recipientName'),
  senderName: text('senderName'),
  personalMessage: text('personalMessage'),
  orderId: text('orderId'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index('gift_card_code_idx').on(table.code),
  index('gift_card_recipientEmail_idx').on(table.recipientEmail),
  index('gift_card_purchaserEmail_idx').on(table.purchaserEmail),
]);

export const downloadToken = pgTable('download_token', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  orderId: uuid('orderId').notNull().references(() => order.id, { onDelete: 'cascade' }),
  orderItemId: uuid('orderItemId').notNull().references(() => orderItem.id, { onDelete: 'cascade' }),
  downloadCount: integer('downloadCount').notNull().default(0),
  maxDownloads: integer('maxDownloads').notNull().default(5),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => [
  index('download_token_token_idx').on(table.token),
  index('download_token_expiresAt_idx').on(table.expiresAt),
]);

// ============================================================================
// RELATIONS
// ============================================================================

// Auth relations
export const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  sessions: many(session),
  auditLogs: many(auditLog),
  customer: one(customer, { fields: [user.id], references: [customer.userId] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

// Domain relations
export const customerRelations = relations(customer, ({ many, one }) => ({
  user: one(user, { fields: [customer.userId], references: [user.id] }),
  appointments: many(appointment),
  tattooSessions: many(tattooSession),
  designs: many(tattooDesign),
  payments: many(payment),
}));

export const tattooArtistRelations = relations(tattooArtist, ({ many }) => ({
  appointments: many(appointment),
  sessions: many(tattooSession),
  designs: many(tattooDesign),
}));

export const appointmentRelations = relations(appointment, ({ one }) => ({
  customer: one(customer, { fields: [appointment.customerId], references: [customer.id] }),
  artist: one(tattooArtist, { fields: [appointment.artistId], references: [tattooArtist.id] }),
  session: one(tattooSession, { fields: [appointment.id], references: [tattooSession.appointmentId] }),
}));

export const tattooSessionRelations = relations(tattooSession, ({ one, many }) => ({
  customer: one(customer, { fields: [tattooSession.customerId], references: [customer.id] }),
  artist: one(tattooArtist, { fields: [tattooSession.artistId], references: [tattooArtist.id] }),
  appointment: one(appointment, { fields: [tattooSession.appointmentId], references: [appointment.id] }),
  payments: many(payment),
}));

export const tattooDesignRelations = relations(tattooDesign, ({ one }) => ({
  artist: one(tattooArtist, { fields: [tattooDesign.artistId], references: [tattooArtist.id] }),
  customer: one(customer, { fields: [tattooDesign.customerId], references: [customer.id] }),
}));

export const contactRelations = relations(contact, () => ({}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, { fields: [auditLog.userId], references: [user.id] }),
}));

export const settingsRelations = relations(settings, () => ({}));

export const consentFormRelations = relations(consentForm, () => ({}));

// Payment relations
export const paymentRelations = relations(payment, ({ one }) => ({
  customer: one(customer, { fields: [payment.customerId], references: [customer.id] }),
  tattooSession: one(tattooSession, { fields: [payment.tattooSessionId], references: [tattooSession.id] }),
}));

export const stripeEventRelations = relations(stripeEvent, () => ({}));

// Store relations
export const productRelations = relations(product, ({ many }) => ({
  orderItems: many(orderItem),
}));

export const orderRelations = relations(order, ({ many }) => ({
  items: many(orderItem),
  downloadTokens: many(downloadToken),
}));

export const orderItemRelations = relations(orderItem, ({ one, many }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  product: one(product, { fields: [orderItem.productId], references: [product.id] }),
  downloadTokens: many(downloadToken),
}));

export const giftCardRelations = relations(giftCard, () => ({}));

export const downloadTokenRelations = relations(downloadToken, ({ one }) => ({
  order: one(order, { fields: [downloadToken.orderId], references: [order.id] }),
  orderItem: one(orderItem, { fields: [downloadToken.orderItemId], references: [orderItem.id] }),
}));
