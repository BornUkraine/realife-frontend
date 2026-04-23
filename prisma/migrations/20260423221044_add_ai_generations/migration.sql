-- CreateEnum
CREATE TYPE "AiGenerationType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "AiGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ai_generations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "type" "AiGenerationType" NOT NULL,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "model" TEXT,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "quality" TEXT,
    "aspectRatio" TEXT,
    "size" TEXT,
    "durationSec" INTEGER,
    "sourceImageUrl" TEXT,
    "previewUrl" TEXT,
    "resultUrl" TEXT,
    "externalJobId" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "errorMessage" TEXT,
    "usedInListing" BOOLEAN NOT NULL DEFAULT false,
    "usedInService" BOOLEAN NOT NULL DEFAULT false,
    "mintedAsNft" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generations_userId_createdAt_idx" ON "ai_generations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generations_status_createdAt_idx" ON "ai_generations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generations_type_createdAt_idx" ON "ai_generations"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generations_externalJobId_idx" ON "ai_generations"("externalJobId");

-- AddForeignKey
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
