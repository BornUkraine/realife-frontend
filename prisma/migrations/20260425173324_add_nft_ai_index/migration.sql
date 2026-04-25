-- CreateEnum
CREATE TYPE "AiEnrichmentStatus" AS ENUM ('NONE', 'PENDING', 'PROCESSING', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "nft_ai_index" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "status" "AiEnrichmentStatus" NOT NULL DEFAULT 'PENDING',
    "visualText" TEXT,
    "visualSummary" TEXT,
    "detectedProduct" TEXT,
    "detectedService" TEXT,
    "detectedCategory" TEXT,
    "detectedBrand" TEXT,
    "detectedCountry" TEXT,
    "detectedRegion" TEXT,
    "detectedCity" TEXT,
    "detectedArea" TEXT,
    "searchTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION,
    "sourceImage" TEXT,
    "sourceAnimation" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "error" TEXT,
    "enrichedAt" TIMESTAMP(3),

    CONSTRAINT "nft_ai_index_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nft_ai_index_chainId_contract_idx" ON "nft_ai_index"("chainId", "contract");

-- CreateIndex
CREATE INDEX "nft_ai_index_status_updatedAt_idx" ON "nft_ai_index"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "nft_ai_index_detectedCountry_idx" ON "nft_ai_index"("detectedCountry");

-- CreateIndex
CREATE INDEX "nft_ai_index_detectedRegion_idx" ON "nft_ai_index"("detectedRegion");

-- CreateIndex
CREATE INDEX "nft_ai_index_detectedCity_idx" ON "nft_ai_index"("detectedCity");

-- CreateIndex
CREATE INDEX "nft_ai_index_detectedCategory_idx" ON "nft_ai_index"("detectedCategory");

-- CreateIndex
CREATE INDEX "nft_ai_index_detectedProduct_idx" ON "nft_ai_index"("detectedProduct");

-- CreateIndex
CREATE INDEX "nft_ai_index_detectedService_idx" ON "nft_ai_index"("detectedService");

-- CreateIndex
CREATE INDEX "nft_ai_index_enrichedAt_idx" ON "nft_ai_index"("enrichedAt");

-- CreateIndex
CREATE UNIQUE INDEX "nft_ai_index_chainId_contract_tokenId_key" ON "nft_ai_index"("chainId", "contract", "tokenId");

-- AddForeignKey
ALTER TABLE "nft_ai_index" ADD CONSTRAINT "nft_ai_index_chainId_contract_tokenId_fkey" FOREIGN KEY ("chainId", "contract", "tokenId") REFERENCES "Mint"("chainId", "contract", "tokenId") ON DELETE CASCADE ON UPDATE CASCADE;
