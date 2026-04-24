-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "serviceCity" TEXT,
ADD COLUMN     "serviceCountry" TEXT;

-- AlterTable
ALTER TABLE "Mint" ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "serviceCity" TEXT,
ADD COLUMN     "serviceCountry" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "serviceCity" TEXT,
ADD COLUMN     "serviceCountry" TEXT;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "serviceArea" TEXT,
ADD COLUMN     "serviceCity" TEXT,
ADD COLUMN     "serviceCountry" TEXT;

-- CreateIndex
CREATE INDEX "Listing_fulfillmentType_serviceCountry_serviceCity_idx" ON "Listing"("fulfillmentType", "serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "Listing_serviceCountry_serviceCity_idx" ON "Listing"("serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "Mint_fulfillmentType_serviceCountry_serviceCity_idx" ON "Mint"("fulfillmentType", "serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "Mint_serviceCountry_serviceCity_idx" ON "Mint"("serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "Trade_fulfillmentType_serviceCountry_serviceCity_idx" ON "Trade"("fulfillmentType", "serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "Trade_serviceCountry_serviceCity_idx" ON "Trade"("serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "store_orders_fulfillmentType_serviceCountry_serviceCity_idx" ON "store_orders"("fulfillmentType", "serviceCountry", "serviceCity");

-- CreateIndex
CREATE INDEX "store_orders_serviceCountry_serviceCity_idx" ON "store_orders"("serviceCountry", "serviceCity");
