-- CreateTable
CREATE TABLE "IndexerState" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "lastBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexerState_chainId_key_idx" ON "IndexerState"("chainId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IndexerState_chainId_key_key" ON "IndexerState"("chainId", "key");
