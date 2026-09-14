-- AlterTable: Add international fields to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(10,4) NOT NULL DEFAULT 1.0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

-- Ensure paymentMethod column exists (nullable during Phase 0)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'paymentMethod') THEN
        ALTER TABLE "orders" ADD COLUMN "paymentMethod" TEXT;
    END IF;
END $$;

-- AlterTable: Add gender to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT 'UNISEX';

-- CreateIndex: Unique index on stripePaymentIntentId
CREATE UNIQUE INDEX IF NOT EXISTS "orders_stripePaymentIntentId_key" ON "orders"("stripePaymentIntentId");

-- One-time backfill for pre-existing orders: safe against re-runs (will not touch future USD Stripe orders)
UPDATE "orders"
SET "currency" = 'USD',
    "exchangeRate" = 1.0000,
    "tax" = 0.00,
    "paymentMethod" = 'COD'
WHERE "paymentMethod" IS NULL;
