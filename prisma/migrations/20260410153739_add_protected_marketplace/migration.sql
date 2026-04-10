-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'COMPLETED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PHYSICAL_GOOD', 'DIGITAL_SERVICE', 'ONLINE_SESSION', 'LOCAL_SERVICE');

-- AlterEnum
ALTER TYPE "MarketType" ADD VALUE 'PROTECTED';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "category" TEXT,
ADD COLUMN     "fulfillmentType" "FulfillmentType",
ADD COLUMN     "subcategory" TEXT;

-- AlterTable
ALTER TABLE "Mint" ADD COLUMN     "category" TEXT,
ADD COLUMN     "fulfillmentType" "FulfillmentType",
ADD COLUMN     "subcategory" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "category" TEXT,
ADD COLUMN     "fulfillmentType" "FulfillmentType",
ADD COLUMN     "subcategory" TEXT;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "category" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "fulfillmentType" "FulfillmentType",
ADD COLUMN     "revisionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "serviceStatus" "ServiceStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "workStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Listing_fulfillmentType_idx" ON "Listing"("fulfillmentType");

-- CreateIndex
CREATE INDEX "Listing_category_subcategory_idx" ON "Listing"("category", "subcategory");

-- CreateIndex
CREATE INDEX "Mint_fulfillmentType_idx" ON "Mint"("fulfillmentType");

-- CreateIndex
CREATE INDEX "Mint_category_subcategory_idx" ON "Mint"("category", "subcategory");

-- CreateIndex
CREATE INDEX "Trade_fulfillmentType_idx" ON "Trade"("fulfillmentType");

-- CreateIndex
CREATE INDEX "Trade_category_subcategory_idx" ON "Trade"("category", "subcategory");

-- CreateIndex
CREATE INDEX "store_orders_serviceStatus_idx" ON "store_orders"("serviceStatus");

-- CreateIndex
CREATE INDEX "store_orders_fulfillmentType_idx" ON "store_orders"("fulfillmentType");

-- CreateIndex
CREATE INDEX "store_orders_category_subcategory_idx" ON "store_orders"("category", "subcategory");
