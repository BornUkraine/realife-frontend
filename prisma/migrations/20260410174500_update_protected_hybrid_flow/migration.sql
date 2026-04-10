-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "buyerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "nftReturnedAt" TIMESTAMP(3),
ADD COLUMN     "refundRejectedAt" TIMESTAMP(3),
ADD COLUMN     "refundRequestedAt" TIMESTAMP(3);
