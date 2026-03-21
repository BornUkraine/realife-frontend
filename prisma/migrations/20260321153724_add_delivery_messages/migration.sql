-- CreateEnum
CREATE TYPE "DeliveryMessageRole" AS ENUM ('BUYER', 'SELLER', 'SUPPORT', 'SYSTEM');

-- CreateTable
CREATE TABLE "delivery_messages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderWallet" TEXT,
    "senderRole" "DeliveryMessageRole" NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_messages_orderId_createdAt_idx" ON "delivery_messages"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "delivery_messages" ADD CONSTRAINT "delivery_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
