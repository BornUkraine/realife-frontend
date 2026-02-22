-- CreateTable
CREATE TABLE "TwitterLinkAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionToken" TEXT NOT NULL,
    "twitterId" TEXT NOT NULL,
    "twitterUser" TEXT,
    "twitterName" TEXT,
    "twitterImage" TEXT,

    CONSTRAINT "TwitterLinkAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwitterLinkAttempt_sessionToken_idx" ON "TwitterLinkAttempt"("sessionToken");

-- CreateIndex
CREATE INDEX "TwitterLinkAttempt_createdAt_idx" ON "TwitterLinkAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "TwitterLinkAttempt_twitterId_idx" ON "TwitterLinkAttempt"("twitterId");
