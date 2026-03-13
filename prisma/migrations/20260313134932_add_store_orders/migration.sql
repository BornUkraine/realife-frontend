-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CONFIRMED', 'RETURN_REQUESTED', 'RETURNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "store_orders" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "sellerWallet" TEXT NOT NULL,
    "buyerId" TEXT,
    "sellerId" TEXT,
    "amount" BIGINT NOT NULL DEFAULT 1,
    "unitPrice" BIGINT NOT NULL,
    "totalPrice" BIGINT NOT NULL,
    "paymentToken" TEXT,
    "deliveryRequired" BOOLEAN NOT NULL DEFAULT false,
    "physicalItem" BOOLEAN NOT NULL DEFAULT false,
    "officialItem" BOOLEAN NOT NULL DEFAULT false,
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "escrowFundedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingCountry" TEXT,
    "shippingCity" TEXT,
    "shippingAddress" TEXT,
    "shippingZip" TEXT,
    "trackingCode" TEXT,
    "trackingUrl" TEXT,
    "carrier" TEXT,
    "buyTxHash" TEXT,
    "escrowReleaseTxHash" TEXT,
    "escrowRefundTxHash" TEXT,
    "noteBuyer" TEXT,
    "noteSeller" TEXT,
    "adminNote" TEXT,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_orders_buyerWallet_idx" ON "store_orders"("buyerWallet");

-- CreateIndex
CREATE INDEX "store_orders_sellerWallet_idx" ON "store_orders"("sellerWallet");

-- CreateIndex
CREATE INDEX "store_orders_buyerId_idx" ON "store_orders"("buyerId");

-- CreateIndex
CREATE INDEX "store_orders_sellerId_idx" ON "store_orders"("sellerId");

-- CreateIndex
CREATE INDEX "store_orders_chainId_contract_tokenId_idx" ON "store_orders"("chainId", "contract", "tokenId");

-- CreateIndex
CREATE INDEX "store_orders_vertical_idx" ON "store_orders"("vertical");

-- CreateIndex
CREATE INDEX "store_orders_escrowStatus_idx" ON "store_orders"("escrowStatus");

-- CreateIndex
CREATE INDEX "store_orders_deliveryStatus_idx" ON "store_orders"("deliveryStatus");

-- CreateIndex
CREATE INDEX "store_orders_createdAt_idx" ON "store_orders"("createdAt");

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
