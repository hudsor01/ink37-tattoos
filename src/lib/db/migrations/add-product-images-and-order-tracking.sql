-- Add product_image table for multi-image gallery support (FEAT-07)
CREATE TABLE IF NOT EXISTS "product_image" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "alt" text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isVisible" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "product_image_productId_idx" ON "product_image" ("productId");
CREATE INDEX IF NOT EXISTS "product_image_productId_sortOrder_idx" ON "product_image" ("productId", "sortOrder");

-- Add tracking columns to order table for fulfillment workflow (FEAT-08)
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "trackingNumber" text;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "trackingCarrier" text;
