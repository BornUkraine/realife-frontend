/*
  Warnings:

  - A unique constraint covering the columns `[tradeId]` on the table `store_orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chainId,marketType,marketplaceContract,marketplacePurchaseId]` on the table `store_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Mint" ADD COLUMN     "metaAnimation" TEXT,
ADD COLUMN     "metaBrand" TEXT,
ADD COLUMN     "metaCollection" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaImage" TEXT,
ADD COLUMN     "metaItem" TEXT,
ADD COLUMN     "metaMediaKind" TEXT,
ADD COLUMN     "metaProject" TEXT,
ADD COLUMN     "metaRarity" TEXT,
ADD COLUMN     "metadataCachedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Mint_metadataCachedAt_idx" ON "Mint"("metadataCachedAt");

-- CreateIndex
CREATE INDEX "Mint_verified_chainId_contract_idx" ON "Mint"("verified", "chainId", "contract");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_tradeId_key" ON "store_orders"("tradeId");

-- CreateIndex
CREATE INDEX "store_orders_buyTxHash_idx" ON "store_orders"("buyTxHash");

-- CreateIndex
CREATE INDEX "store_orders_escrowReleaseTxHash_idx" ON "store_orders"("escrowReleaseTxHash");

-- CreateIndex
CREATE INDEX "store_orders_escrowRefundTxHash_idx" ON "store_orders"("escrowRefundTxHash");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_chainId_marketType_marketplaceContract_marketp_key" ON "store_orders"("chainId", "marketType", "marketplaceContract", "marketplacePurchaseId");
