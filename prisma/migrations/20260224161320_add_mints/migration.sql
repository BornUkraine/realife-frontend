-- CreateTable
CREATE TABLE "Mint" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "txHash" TEXT,
    "tokenUri" TEXT,
    "name" TEXT,
    "image" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Mint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mint_txHash_key" ON "Mint"("txHash");

-- CreateIndex
CREATE INDEX "Mint_userId_createdAt_idx" ON "Mint"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mint_chainId_contract_tokenId_key" ON "Mint"("chainId", "contract", "tokenId");

-- AddForeignKey
ALTER TABLE "Mint" ADD CONSTRAINT "Mint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
