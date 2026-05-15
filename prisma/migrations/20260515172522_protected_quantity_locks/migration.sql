-- CreateEnum
CREATE TYPE "ProtectedNftLockStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_LOCKED', 'COMPLETED_LOCKED', 'RETURNED_TO_SELLER', 'UNLOCKED', 'INVALIDATED');

-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "completedLockedAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "pendingLockedAmount" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "protectedNftCompletedAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "protectedNftCompletedAt" TIMESTAMP(3),
ADD COLUMN     "protectedNftLockStatus" "ProtectedNftLockStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "protectedNftLockedAt" TIMESTAMP(3),
ADD COLUMN     "protectedNftPendingAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "protectedNftUnlockedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Holding_pendingLockedAmount_idx" ON "Holding"("pendingLockedAmount");

-- CreateIndex
CREATE INDEX "Holding_completedLockedAmount_idx" ON "Holding"("completedLockedAmount");

-- CreateIndex
CREATE INDEX "store_orders_protectedNftLockStatus_idx" ON "store_orders"("protectedNftLockStatus");

-- CreateIndex
CREATE INDEX "store_orders_protectedNftPendingAmount_idx" ON "store_orders"("protectedNftPendingAmount");

-- CreateIndex
CREATE INDEX "store_orders_protectedNftCompletedAmount_idx" ON "store_orders"("protectedNftCompletedAmount");
