/*
  Warnings:

  - A unique constraint covering the columns `[chainId,marketType,marketplaceContract,marketplaceListingId]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Listing_chainId_marketType_marketplaceListingId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Listing_chainId_marketType_marketplaceContract_marketplaceL_key" ON "Listing"("chainId", "marketType", "marketplaceContract", "marketplaceListingId");
