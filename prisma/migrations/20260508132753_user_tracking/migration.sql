-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmbeddedWalletProvider" ADD VALUE 'METAMASK_EMBEDDED';
ALTER TYPE "EmbeddedWalletProvider" ADD VALUE 'TURNKEY';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstCity" TEXT,
ADD COLUMN     "firstCountry" TEXT,
ADD COLUMN     "firstIp" TEXT,
ADD COLUMN     "firstLoginAt" TIMESTAMP(3),
ADD COLUMN     "firstRegion" TEXT,
ADD COLUMN     "firstUserAgent" TEXT,
ADD COLUMN     "lastAuthMethod" "AuthMethod",
ADD COLUMN     "lastCity" TEXT,
ADD COLUMN     "lastCountry" TEXT,
ADD COLUMN     "lastEmbeddedWalletProvider" "EmbeddedWalletProvider",
ADD COLUMN     "lastIp" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastRegion" TEXT,
ADD COLUMN     "lastUserAgent" TEXT,
ADD COLUMN     "lastWalletKind" "WalletKind";

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER,
    "kind" "WalletKind" NOT NULL DEFAULT 'EXTERNAL',
    "embeddedWalletProvider" "EmbeddedWalletProvider",
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIp" TEXT,
    "lastUserAgent" TEXT,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLoginEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'SESSION_CHECK',
    "walletAddress" TEXT,
    "walletChainId" INTEGER,
    "authMethod" "AuthMethod",
    "walletKind" "WalletKind",
    "embeddedWalletProvider" "EmbeddedWalletProvider",
    "googleId" TEXT,
    "googleEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "referrer" TEXT,
    "path" TEXT,

    CONSTRAINT "UserLoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWallet_address_idx" ON "UserWallet"("address");

-- CreateIndex
CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_kind_idx" ON "UserWallet"("kind");

-- CreateIndex
CREATE INDEX "UserWallet_embeddedWalletProvider_idx" ON "UserWallet"("embeddedWalletProvider");

-- CreateIndex
CREATE INDEX "UserWallet_isPrimary_idx" ON "UserWallet"("isPrimary");

-- CreateIndex
CREATE INDEX "UserWallet_lastSeenAt_idx" ON "UserWallet"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_address_key" ON "UserWallet"("userId", "address");

-- CreateIndex
CREATE INDEX "UserLoginEvent_userId_idx" ON "UserLoginEvent"("userId");

-- CreateIndex
CREATE INDEX "UserLoginEvent_createdAt_idx" ON "UserLoginEvent"("createdAt");

-- CreateIndex
CREATE INDEX "UserLoginEvent_eventType_idx" ON "UserLoginEvent"("eventType");

-- CreateIndex
CREATE INDEX "UserLoginEvent_walletAddress_idx" ON "UserLoginEvent"("walletAddress");

-- CreateIndex
CREATE INDEX "UserLoginEvent_googleEmail_idx" ON "UserLoginEvent"("googleEmail");

-- CreateIndex
CREATE INDEX "UserLoginEvent_ip_idx" ON "UserLoginEvent"("ip");

-- CreateIndex
CREATE INDEX "UserLoginEvent_country_idx" ON "UserLoginEvent"("country");

-- CreateIndex
CREATE INDEX "UserLoginEvent_userId_createdAt_idx" ON "UserLoginEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserLoginEvent_ip_createdAt_idx" ON "UserLoginEvent"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "User_firstIp_idx" ON "User"("firstIp");

-- CreateIndex
CREATE INDEX "User_lastIp_idx" ON "User"("lastIp");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE INDEX "User_lastCountry_idx" ON "User"("lastCountry");

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoginEvent" ADD CONSTRAINT "UserLoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
