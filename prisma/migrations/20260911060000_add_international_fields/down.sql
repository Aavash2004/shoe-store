-- Rollback script for migration 20260911060000_add_international_fields

-- Drop index
DROP INDEX IF EXISTS "orders_stripePaymentIntentId_key";

-- Drop columns on orders
ALTER TABLE "orders" DROP COLUMN IF EXISTS "stripePaymentIntentId";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "tax";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "exchangeRate";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "currency";

-- Note: paymentMethod is left intact if pre-existing, or dropped if desired:
-- ALTER TABLE "orders" DROP COLUMN IF EXISTS "paymentMethod";

-- Drop column on products
ALTER TABLE "products" DROP COLUMN IF EXISTS "gender";
