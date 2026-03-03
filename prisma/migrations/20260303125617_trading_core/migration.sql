-- CreateEnum
CREATE TYPE "NftStandard" AS ENUM ('ERC721', 'ERC1155');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'SOLD_OUT');

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "standard" "NftStandard" NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "standard" "NftStandard" NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerWallet" TEXT NOT NULL,
    "marketplaceListingId" BIGINT NOT NULL,
    "pricePerUnitWei" BIGINT NOT NULL,
    "amountTotal" BIGINT NOT NULL DEFAULT 1,
    "amountRemaining" BIGINT NOT NULL DEFAULT 1,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" TIMESTAMP(3),
    "soldOutAt" TIMESTAMP(3),
    "createdTxHash" TEXT,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "standard" "NftStandard" NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockNum" BIGINT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "marketplaceListingId" BIGINT,
    "sellerWallet" TEXT NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "sellerId" TEXT,
    "buyerId" TEXT,
    "amount" BIGINT NOT NULL DEFAULT 1,
    "pricePerUnitWei" BIGINT NOT NULL,
    "totalPriceWei" BIGINT NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_chainId_contract_tokenId_idx" ON "Holding"("chainId", "contract", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_chainId_contract_tokenId_key" ON "Holding"("userId", "chainId", "contract", "tokenId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_sellerWallet_idx" ON "Listing"("sellerWallet");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Listing_chainId_contract_tokenId_idx" ON "Listing"("chainId", "contract", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_chainId_marketplaceListingId_key" ON "Listing"("chainId", "marketplaceListingId");

-- CreateIndex
CREATE INDEX "Trade_chainId_contract_tokenId_blockTime_idx" ON "Trade"("chainId", "contract", "tokenId", "blockTime");

-- CreateIndex
CREATE INDEX "Trade_sellerWallet_idx" ON "Trade"("sellerWallet");

-- CreateIndex
CREATE INDEX "Trade_buyerWallet_idx" ON "Trade"("buyerWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_chainId_txHash_logIndex_key" ON "Trade"("chainId", "txHash", "logIndex");

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_chainId_contract_tokenId_fkey" FOREIGN KEY ("chainId", "contract", "tokenId") REFERENCES "Mint"("chainId", "contract", "tokenId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_chainId_contract_tokenId_fkey" FOREIGN KEY ("chainId", "contract", "tokenId") REFERENCES "Mint"("chainId", "contract", "tokenId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_chainId_contract_tokenId_fkey" FOREIGN KEY ("chainId", "contract", "tokenId") REFERENCES "Mint"("chainId", "contract", "tokenId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
