-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "paymentDecimals" INTEGER,
ADD COLUMN     "paymentSymbol" TEXT,
ADD COLUMN     "paymentTokenAddress" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "paymentDecimals" INTEGER,
ADD COLUMN     "paymentSymbol" TEXT,
ADD COLUMN     "paymentTokenAddress" TEXT;

-- AlterTable
ALTER TABLE "store_orders" ADD COLUMN     "paymentDecimals" INTEGER,
ADD COLUMN     "paymentSymbol" TEXT;

-- CreateIndex
CREATE INDEX "Listing_paymentTokenAddress_idx" ON "Listing"("paymentTokenAddress");

-- CreateIndex
CREATE INDEX "Listing_paymentSymbol_idx" ON "Listing"("paymentSymbol");

-- CreateIndex
CREATE INDEX "Trade_paymentTokenAddress_idx" ON "Trade"("paymentTokenAddress");

-- CreateIndex
CREATE INDEX "Trade_paymentSymbol_idx" ON "Trade"("paymentSymbol");

-- CreateIndex
CREATE INDEX "store_orders_paymentToken_idx" ON "store_orders"("paymentToken");

-- CreateIndex
CREATE INDEX "store_orders_paymentSymbol_idx" ON "store_orders"("paymentSymbol");
