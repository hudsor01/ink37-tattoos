-- PRODUCTION BASELINE: If deploying to an existing database, do NOT run this migration.
-- Instead, insert a record into __drizzle_migrations using the hash from meta/_journal.json.
-- See DEPLOYMENT.md for the exact SQL command.

CREATE TYPE "public"."AppointmentStatus" AS ENUM('PENDING', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."AppointmentType" AS ENUM('CONSULTATION', 'DESIGN_REVIEW', 'TATTOO_SESSION', 'TOUCH_UP', 'REMOVAL');--> statement-breakpoint
CREATE TYPE "public"."ContactStatus" AS ENUM('NEW', 'READ', 'REPLIED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."OrderStatus" AS ENUM('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."PaymentType" AS ENUM('DEPOSIT', 'SESSION_BALANCE', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."ProductType" AS ENUM('PHYSICAL', 'DIGITAL', 'GIFT_CARD');--> statement-breakpoint
CREATE TYPE "public"."SessionStatus" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"type" text DEFAULT 'credential' NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"artistId" uuid,
	"scheduledDate" timestamp NOT NULL,
	"duration" integer,
	"status" "AppointmentStatus" DEFAULT 'PENDING' NOT NULL,
	"type" "AppointmentType" DEFAULT 'CONSULTATION' NOT NULL,
	"calBookingUid" text,
	"calEventTypeId" integer,
	"calStatus" text,
	"calMeetingUrl" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"tattooType" text,
	"size" text,
	"placement" text,
	"description" text,
	"source" text DEFAULT 'website' NOT NULL,
	"notes" text,
	"reminderSent" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_calBookingUid_unique" UNIQUE("calBookingUid")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resourceId" text,
	"ip" text NOT NULL,
	"userAgent" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "cal_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calEventUid" text NOT NULL,
	"triggerEvent" text NOT NULL,
	"processedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_form" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"title" text DEFAULT 'Tattoo Consent Form' NOT NULL,
	"content" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consent_form_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"status" "ContactStatus" DEFAULT 'NEW' NOT NULL,
	"adminNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text,
	"phone" text,
	"userId" uuid,
	"dateOfBirth" timestamp,
	"address" text,
	"city" text,
	"state" text,
	"postalCode" text,
	"country" text,
	"emergencyName" text,
	"emergencyPhone" text,
	"emergencyRel" text,
	"allergies" text[],
	"medicalConditions" text[],
	"preferredArtist" text,
	"notes" text,
	"stripeCustomerId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_email_unique" UNIQUE("email"),
	CONSTRAINT "customer_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "download_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"orderId" uuid NOT NULL,
	"orderItemId" uuid NOT NULL,
	"downloadCount" integer DEFAULT 0 NOT NULL,
	"maxDownloads" integer DEFAULT 5 NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "download_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "gift_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"initialBalance" numeric(10, 2) NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"purchaserEmail" text NOT NULL,
	"recipientEmail" text NOT NULL,
	"recipientName" text,
	"senderName" text,
	"personalMessage" text,
	"orderId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_card_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "OrderStatus" DEFAULT 'PENDING' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"shippingAmount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"discountAmount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"stripeCheckoutSessionId" text,
	"stripePaymentIntentId" text,
	"shippingName" text,
	"shippingAddress" text,
	"shippingCity" text,
	"shippingState" text,
	"shippingPostalCode" text,
	"shippingCountry" text,
	"giftCardCode" text,
	"trackingNumber" text,
	"trackingCarrier" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_stripeCheckoutSessionId_unique" UNIQUE("stripeCheckoutSessionId")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" uuid NOT NULL,
	"productId" uuid NOT NULL,
	"productName" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(10, 2) NOT NULL,
	"totalPrice" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"tattooSessionId" uuid NOT NULL,
	"type" "PaymentType" NOT NULL,
	"status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"stripeCheckoutSessionId" text,
	"stripePaymentIntentId" text,
	"receiptUrl" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"productType" "ProductType" NOT NULL,
	"imageUrl" text,
	"digitalFilePathname" text,
	"digitalFileName" text,
	"stripeProductId" text,
	"stripePriceId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_stripeProductId_unique" UNIQUE("stripeProductId"),
	CONSTRAINT "product_stripePriceId_unique" UNIQUE("stripePriceId")
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isVisible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"impersonatedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"isEnvironment" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "stripe_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripeEventId" text NOT NULL,
	"type" text NOT NULL,
	"processedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_event_stripeEventId_unique" UNIQUE("stripeEventId")
);
--> statement-breakpoint
CREATE TABLE "tattoo_artist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"specialties" text[],
	"hourlyRate" numeric(10, 2) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"portfolio" text[],
	"bio" text,
	"profileImage" text,
	"instagramHandle" text,
	"yearsExperience" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tattoo_artist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tattoo_design" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fileUrl" text NOT NULL,
	"thumbnailUrl" text,
	"designType" text,
	"size" text,
	"style" text,
	"tags" text[],
	"isApproved" boolean DEFAULT false NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"rejectionNotes" text,
	"estimatedHours" numeric(10, 2),
	"popularity" integer DEFAULT 0 NOT NULL,
	"artistId" uuid NOT NULL,
	"customerId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tattoo_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"artistId" uuid NOT NULL,
	"appointmentId" uuid,
	"appointmentDate" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"status" "SessionStatus" DEFAULT 'SCHEDULED' NOT NULL,
	"designDescription" text NOT NULL,
	"placement" text NOT NULL,
	"size" text NOT NULL,
	"style" text NOT NULL,
	"referenceImages" text[],
	"hourlyRate" numeric(10, 2) NOT NULL,
	"estimatedHours" numeric(10, 2) NOT NULL,
	"depositAmount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"totalCost" numeric(10, 2) NOT NULL,
	"paidAmount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"notes" text,
	"aftercareProvided" boolean DEFAULT false NOT NULL,
	"consentSigned" boolean DEFAULT false NOT NULL,
	"consentSignedAt" timestamp,
	"consentSignedBy" text,
	"consentFormVersion" integer,
	"consentExpiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tattoo_session_appointmentId_unique" UNIQUE("appointmentId")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"banReason" text,
	"banExpires" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_artistId_tattoo_artist_id_fk" FOREIGN KEY ("artistId") REFERENCES "public"."tattoo_artist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_token" ADD CONSTRAINT "download_token_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_token" ADD CONSTRAINT "download_token_orderItemId_order_item_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."order_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderId_order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_tattooSessionId_tattoo_session_id_fk" FOREIGN KEY ("tattooSessionId") REFERENCES "public"."tattoo_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tattoo_design" ADD CONSTRAINT "tattoo_design_artistId_tattoo_artist_id_fk" FOREIGN KEY ("artistId") REFERENCES "public"."tattoo_artist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tattoo_design" ADD CONSTRAINT "tattoo_design_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tattoo_session" ADD CONSTRAINT "tattoo_session_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tattoo_session" ADD CONSTRAINT "tattoo_session_artistId_tattoo_artist_id_fk" FOREIGN KEY ("artistId") REFERENCES "public"."tattoo_artist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tattoo_session" ADD CONSTRAINT "tattoo_session_appointmentId_appointment_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "appointment_scheduledDate_idx" ON "appointment" USING btree ("scheduledDate");--> statement-breakpoint
CREATE INDEX "appointment_status_idx" ON "appointment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointment_email_idx" ON "appointment" USING btree ("email");--> statement-breakpoint
CREATE INDEX "appointment_customerId_scheduledDate_idx" ON "appointment" USING btree ("customerId","scheduledDate");--> statement-breakpoint
CREATE INDEX "appointment_scheduledDate_status_idx" ON "appointment" USING btree ("scheduledDate","status");--> statement-breakpoint
CREATE INDEX "appointment_createdAt_idx" ON "appointment" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_log_userId_idx" ON "audit_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "cal_event_calEventUid_idx" ON "cal_event" USING btree ("calEventUid");--> statement-breakpoint
CREATE INDEX "contact_email_idx" ON "contact" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contact_status_idx" ON "contact" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contact_createdAt_idx" ON "contact" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "customer_email_idx" ON "customer" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customer" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customer_firstName_lastName_idx" ON "customer" USING btree ("firstName","lastName");--> statement-breakpoint
CREATE INDEX "customer_createdAt_idx" ON "customer" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "download_token_token_idx" ON "download_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX "download_token_expiresAt_idx" ON "download_token" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "gift_card_code_idx" ON "gift_card" USING btree ("code");--> statement-breakpoint
CREATE INDEX "gift_card_recipientEmail_idx" ON "gift_card" USING btree ("recipientEmail");--> statement-breakpoint
CREATE INDEX "gift_card_purchaserEmail_idx" ON "gift_card" USING btree ("purchaserEmail");--> statement-breakpoint
CREATE INDEX "notification_userId_idx" ON "notification" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "notification_isRead_idx" ON "notification" USING btree ("isRead");--> statement-breakpoint
CREATE INDEX "notification_createdAt_idx" ON "notification" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "notification_userId_isRead_idx" ON "notification" USING btree ("userId","isRead");--> statement-breakpoint
CREATE INDEX "order_email_idx" ON "order" USING btree ("email");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_createdAt_idx" ON "order" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "order_stripeCheckoutSessionId_idx" ON "order" USING btree ("stripeCheckoutSessionId");--> statement-breakpoint
CREATE INDEX "order_item_orderId_idx" ON "order_item" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "order_item_productId_idx" ON "order_item" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "payment_customerId_idx" ON "payment" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "payment_tattooSessionId_idx" ON "payment" USING btree ("tattooSessionId");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_type_idx" ON "payment" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payment_createdAt_idx" ON "payment" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "payment_stripePaymentIntentId_idx" ON "payment" USING btree ("stripePaymentIntentId");--> statement-breakpoint
CREATE INDEX "product_productType_idx" ON "product" USING btree ("productType");--> statement-breakpoint
CREATE INDEX "product_isActive_idx" ON "product" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "product_isActive_productType_idx" ON "product" USING btree ("isActive","productType");--> statement-breakpoint
CREATE INDEX "product_image_productId_idx" ON "product_image" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "product_image_sortOrder_idx" ON "product_image" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_expiresAt_idx" ON "session" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "settings_category_idx" ON "settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "settings_key_idx" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "stripe_event_stripeEventId_idx" ON "stripe_event" USING btree ("stripeEventId");--> statement-breakpoint
CREATE INDEX "tattoo_design_isApproved_idx" ON "tattoo_design" USING btree ("isApproved");--> statement-breakpoint
CREATE INDEX "tattoo_design_designType_idx" ON "tattoo_design" USING btree ("designType");--> statement-breakpoint
CREATE INDEX "tattoo_design_artistId_idx" ON "tattoo_design" USING btree ("artistId");--> statement-breakpoint
CREATE INDEX "tattoo_design_createdAt_idx" ON "tattoo_design" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "tattoo_design_isApproved_createdAt_idx" ON "tattoo_design" USING btree ("isApproved","createdAt");--> statement-breakpoint
CREATE INDEX "tattoo_session_appointmentDate_idx" ON "tattoo_session" USING btree ("appointmentDate");--> statement-breakpoint
CREATE INDEX "tattoo_session_status_idx" ON "tattoo_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tattoo_session_appointmentDate_status_idx" ON "tattoo_session" USING btree ("appointmentDate","status");--> statement-breakpoint
CREATE INDEX "tattoo_session_appointmentDate_totalCost_idx" ON "tattoo_session" USING btree ("appointmentDate","totalCost");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "verification" USING btree ("identifier","value");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expiresAt_idx" ON "verification" USING btree ("expiresAt");