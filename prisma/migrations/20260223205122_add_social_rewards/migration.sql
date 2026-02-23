-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordRewarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twitterRewarded" BOOLEAN NOT NULL DEFAULT false;
