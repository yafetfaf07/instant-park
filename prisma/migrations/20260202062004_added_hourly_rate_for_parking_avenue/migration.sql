/*
  Warnings:

  - Added the required column `hourlyRate` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParkingAvenue" ADD COLUMN     "hourlyRate" DOUBLE PRECISION NOT NULL;
