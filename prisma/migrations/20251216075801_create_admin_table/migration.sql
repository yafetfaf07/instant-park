/*
  Warnings:

  - You are about to drop the column `ownerId` on the `ParkingAvenue` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ParkingAvenue" DROP CONSTRAINT "ParkingAvenue_ownerId_fkey";

-- AlterTable
ALTER TABLE "ParkingAvenue" DROP COLUMN "ownerId";

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
