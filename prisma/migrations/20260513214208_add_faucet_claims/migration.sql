-- CreateEnum
CREATE TYPE "FaucetAsset" AS ENUM ('ETH', 'USDC');

-- CreateEnum
CREATE TYPE "FaucetClaimStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "faucet_claims" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "chainId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "asset" "FaucetAsset" NOT NULL,
    "amountRaw" BIGINT NOT NULL,
    "amountLabel" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "txHash" TEXT,
    "status" "FaucetClaimStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,

    CONSTRAINT "faucet_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faucet_claims_txHash_key" ON "faucet_claims"("txHash");

-- CreateIndex
CREATE INDEX "faucet_claims_userId_idx" ON "faucet_claims"("userId");

-- CreateIndex
CREATE INDEX "faucet_claims_walletAddress_asset_createdAt_idx" ON "faucet_claims"("walletAddress", "asset", "createdAt");

-- CreateIndex
CREATE INDEX "faucet_claims_ipHash_asset_createdAt_idx" ON "faucet_claims"("ipHash", "asset", "createdAt");

-- CreateIndex
CREATE INDEX "faucet_claims_asset_status_createdAt_idx" ON "faucet_claims"("asset", "status", "createdAt");

-- CreateIndex
CREATE INDEX "faucet_claims_chainId_txHash_idx" ON "faucet_claims"("chainId", "txHash");

-- AddForeignKey
ALTER TABLE "faucet_claims" ADD CONSTRAINT "faucet_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
