-- Migration: Add stockReserved and manualReviewReason to orders table
-- Description: Records whether inventory stock and coupon discount are reserved
--              for orders in MANUAL_REVIEW (distinguishing amount mismatch vs out-of-stock late payment)
-- Status: PREPARED (Do not apply directly to production without change approval)

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stockReserved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manualReviewReason" TEXT;
