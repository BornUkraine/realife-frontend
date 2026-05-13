-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "buyerLastReadAt" TIMESTAMP(3),
ADD COLUMN     "sellerLastReadAt" TIMESTAMP(3);
