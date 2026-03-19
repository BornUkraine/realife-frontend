/*
  Warnings:

  - A unique constraint covering the columns `[chainId,marketType,marketplaceListingId]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('STANDARD', 'DELIVERY');

-- DropIndex
DROP INDEX "Listing_chainId_marketplaceListingId_key";

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "marketType" "MarketType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "marketplaceContract" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "marketType" "MarketType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "marketplaceContract" TEXT,
ADD COLUMN     "marketplacePurchaseId" BIGINT;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "marketType" "MarketType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "marketplaceContract" TEXT,
ADD COLUMN     "marketplacePurchaseId" BIGINT;

-- CreateIndex
CREATE INDEX "Listing_marketType_idx" ON "Listing"("marketType");

-- CreateIndex
CREATE INDEX "Listing_marketplaceContract_idx" ON "Listing"("marketplaceContract");

-- CreateIndex
CREATE INDEX "Listing_marketType_marketplaceListingId_idx" ON "Listing"("marketType", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "Listing_marketplaceContract_marketplaceListingId_idx" ON "Listing"("marketplaceContract", "marketplaceListingId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_chainId_marketType_marketplaceListingId_key" ON "Listing"("chainId", "marketType", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "Trade_marketplaceListingId_idx" ON "Trade"("marketplaceListingId");

-- CreateIndex
CREATE INDEX "Trade_marketplacePurchaseId_idx" ON "Trade"("marketplacePurchaseId");

-- CreateIndex
CREATE INDEX "Trade_marketType_idx" ON "Trade"("marketType");

-- CreateIndex
CREATE INDEX "Trade_marketplaceContract_idx" ON "Trade"("marketplaceContract");

-- CreateIndex
CREATE INDEX "Trade_marketType_marketplaceListingId_idx" ON "Trade"("marketType", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "Trade_marketType_marketplacePurchaseId_idx" ON "Trade"("marketType", "marketplacePurchaseId");

-- CreateIndex
CREATE INDEX "Trade_marketplaceContract_marketplaceListingId_idx" ON "Trade"("marketplaceContract", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "Trade_marketplaceContract_marketplacePurchaseId_idx" ON "Trade"("marketplaceContract", "marketplacePurchaseId");

-- CreateIndex
CREATE INDEX "store_orders_marketplacePurchaseId_idx" ON "store_orders"("marketplacePurchaseId");

-- CreateIndex
CREATE INDEX "store_orders_marketType_idx" ON "store_orders"("marketType");

-- CreateIndex
CREATE INDEX "store_orders_marketplaceContract_idx" ON "store_orders"("marketplaceContract");

-- CreateIndex
CREATE INDEX "store_orders_marketType_marketplaceListingId_idx" ON "store_orders"("marketType", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "store_orders_marketType_marketplacePurchaseId_idx" ON "store_orders"("marketType", "marketplacePurchaseId");

-- CreateIndex
CREATE INDEX "store_orders_marketplaceContract_marketplaceListingId_idx" ON "store_orders"("marketplaceContract", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "store_orders_marketplaceContract_marketplacePurchaseId_idx" ON "store_orders"("marketplaceContract", "marketplacePurchaseId");
