/*
  Warnings:

  - A unique constraint covering the columns `[userId,type,refUserId]` on the table `PointEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PointEvent" ADD COLUMN     "refUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredAt" TIMESTAMP(3),
ADD COLUMN     "referredById" TEXT;

-- CreateIndex
CREATE INDEX "PointEvent_refUserId_idx" ON "PointEvent"("refUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PointEvent_userId_type_refUserId_key" ON "PointEvent"("userId", "type", "refUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
