/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Warden` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Warden" DROP CONSTRAINT "Warden_ownerId_fkey";

-- AlterTable
ALTER TABLE "Warden" DROP COLUMN "ownerId";
