/*
  Warnings:

  - Added the required column `personalId` to the `ParkingAvenueOwner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParkingAvenueOwner" ADD COLUMN     "personalId" TEXT NOT NULL;
