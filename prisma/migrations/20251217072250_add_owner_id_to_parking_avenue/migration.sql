/*
  Warnings:

  - Added the required column `ownerId` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParkingAvenue" ADD COLUMN     "ownerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ParkingAvenue" ADD CONSTRAINT "ParkingAvenue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ParkingAvenueOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
