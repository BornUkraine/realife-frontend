-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "adminHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminHiddenAt" TIMESTAMP(3),
ADD COLUMN     "adminHiddenByUserId" TEXT,
ADD COLUMN     "adminHiddenByWallet" TEXT,
ADD COLUMN     "adminHiddenNote" TEXT,
ADD COLUMN     "adminHiddenReason" TEXT;

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "orderId" TEXT,
    "deliveryMessageId" TEXT,
    "actorUserId" TEXT,
    "actorWallet" TEXT,
    "actorRole" "DeliveryMessageRole",
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedByWallet" TEXT,
    "metadata" JSONB,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminUserId" TEXT,
    "adminWallet" TEXT,
    "adminRole" "SupportRole",
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "metadata" JSONB,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications"("type");

-- CreateIndex
CREATE INDEX "admin_notifications_status_idx" ON "admin_notifications"("status");

-- CreateIndex
CREATE INDEX "admin_notifications_priority_idx" ON "admin_notifications"("priority");

-- CreateIndex
CREATE INDEX "admin_notifications_orderId_idx" ON "admin_notifications"("orderId");

-- CreateIndex
CREATE INDEX "admin_notifications_actorWallet_idx" ON "admin_notifications"("actorWallet");

-- CreateIndex
CREATE INDEX "admin_notifications_createdAt_idx" ON "admin_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "admin_notifications_status_createdAt_idx" ON "admin_notifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminUserId_idx" ON "admin_action_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminWallet_idx" ON "admin_action_logs"("adminWallet");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminRole_idx" ON "admin_action_logs"("adminRole");

-- CreateIndex
CREATE INDEX "admin_action_logs_action_idx" ON "admin_action_logs"("action");

-- CreateIndex
CREATE INDEX "admin_action_logs_targetType_targetId_idx" ON "admin_action_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "admin_action_logs_createdAt_idx" ON "admin_action_logs"("createdAt");

-- CreateIndex
CREATE INDEX "Listing_adminHidden_idx" ON "Listing"("adminHidden");

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
