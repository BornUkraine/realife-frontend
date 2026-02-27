/*
  Warnings:

  - You are about to drop the column `refUserId` on the `PointEvent` table. All the data in the column will be lost.
  - You are about to drop the column `referralCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `referredAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `referredById` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- DropIndex
DROP INDEX "PointEvent_refUserId_idx";

-- DropIndex
DROP INDEX "PointEvent_userId_type_refUserId_key";

-- DropIndex
DROP INDEX "User_referralCode_key";

-- AlterTable
ALTER TABLE "PointEvent" DROP COLUMN "refUserId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "referralCode",
DROP COLUMN "referredAt",
DROP COLUMN "referredById";
