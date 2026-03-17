-- CreateEnum
CREATE TYPE "OrderSourceType" AS ENUM ('STORE', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "OrderKind" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officialItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "physicalItemIncluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Mint" ADD COLUMN     "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officialItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "physicalItemIncluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvedPhysicalAt" TIMESTAMP(3),
ADD COLUMN     "approvedPhysicalNote" TEXT,
ADD COLUMN     "approvedPhysicalSeller" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "listingId" TEXT,
ADD COLUMN     "marketplaceListingId" BIGINT,
ADD COLUMN     "orderKind" "OrderKind" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN     "sourceType" "OrderSourceType" NOT NULL DEFAULT 'STORE',
ADD COLUMN     "tradeId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_deliveryEnabled_physicalItemIncluded_idx" ON "Listing"("deliveryEnabled", "physicalItemIncluded");

-- CreateIndex
CREATE INDEX "Mint_chainId_contract_tokenId_idx" ON "Mint"("chainId", "contract", "tokenId");

-- CreateIndex
CREATE INDEX "Mint_deliveryEnabled_physicalItemIncluded_idx" ON "Mint"("deliveryEnabled", "physicalItemIncluded");

-- CreateIndex
CREATE INDEX "User_approvedPhysicalSeller_idx" ON "User"("approvedPhysicalSeller");

-- CreateIndex
CREATE INDEX "store_orders_sourceType_orderKind_idx" ON "store_orders"("sourceType", "orderKind");

-- CreateIndex
CREATE INDEX "store_orders_listingId_idx" ON "store_orders"("listingId");

-- CreateIndex
CREATE INDEX "store_orders_tradeId_idx" ON "store_orders"("tradeId");

-- CreateIndex
CREATE INDEX "store_orders_marketplaceListingId_idx" ON "store_orders"("marketplaceListingId");
