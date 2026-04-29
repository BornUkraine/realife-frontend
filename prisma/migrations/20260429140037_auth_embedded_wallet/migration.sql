-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('WALLET', 'GOOGLE');

-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('EXTERNAL', 'EMBEDDED');

-- CreateEnum
CREATE TYPE "EmbeddedWalletProvider" AS ENUM ('WEB3AUTH', 'OPENFORT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authMethod" "AuthMethod" NOT NULL DEFAULT 'WALLET',
ADD COLUMN     "embeddedWalletProvider" "EmbeddedWalletProvider",
ADD COLUMN     "googleEmail" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "googleImage" TEXT,
ADD COLUMN     "googleName" TEXT,
ADD COLUMN     "walletKind" "WalletKind" NOT NULL DEFAULT 'EXTERNAL';

-- CreateIndex
CREATE INDEX "User_authMethod_idx" ON "User"("authMethod");

-- CreateIndex
CREATE INDEX "User_walletKind_idx" ON "User"("walletKind");

-- CreateIndex
CREATE INDEX "User_embeddedWalletProvider_idx" ON "User"("embeddedWalletProvider");

-- CreateIndex
CREATE INDEX "User_googleEmail_idx" ON "User"("googleEmail");
