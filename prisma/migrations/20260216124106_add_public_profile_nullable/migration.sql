/*
  Warnings:

  - A unique constraint covering the columns `[handle]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_discordUser_key";

-- DropIndex
DROP INDEX "User_twitterUser_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "handle" TEXT,
ADD COLUMN     "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
