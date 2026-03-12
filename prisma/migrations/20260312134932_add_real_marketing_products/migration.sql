-- CreateTable
CREATE TABLE "real_marketing_products" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "creatorWallet" TEXT,
    "primarySellerWallet" TEXT,
    "paymentToken" TEXT,
    "tokenUri" TEXT,
    "name" TEXT,
    "image" TEXT,
    "maxSupply" BIGINT NOT NULL DEFAULT 0,
    "mintedSupply" BIGINT NOT NULL DEFAULT 0,
    "price" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "physicalItemIncluded" BOOLEAN NOT NULL DEFAULT false,
    "officialItem" BOOLEAN NOT NULL DEFAULT false,
    "lastTxHash" TEXT,

    CONSTRAINT "real_marketing_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "real_marketing_products_vertical_isActive_idx" ON "real_marketing_products"("vertical", "isActive");

-- CreateIndex
CREATE INDEX "real_marketing_products_contract_tokenId_idx" ON "real_marketing_products"("contract", "tokenId");

-- CreateIndex
CREATE INDEX "real_marketing_products_primarySellerWallet_idx" ON "real_marketing_products"("primarySellerWallet");

-- CreateIndex
CREATE INDEX "real_marketing_products_creatorWallet_idx" ON "real_marketing_products"("creatorWallet");

-- CreateIndex
CREATE UNIQUE INDEX "real_marketing_products_chainId_contract_tokenId_key" ON "real_marketing_products"("chainId", "contract", "tokenId");
