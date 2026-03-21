-- CreateEnum
CREATE TYPE "SupportRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "supportRole" "SupportRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "User_supportRole_idx" ON "User"("supportRole");
