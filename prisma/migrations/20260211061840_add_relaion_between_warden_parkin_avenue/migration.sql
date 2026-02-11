/*
  Warnings:

  - Added the required column `parkingAvenueId` to the `Warden` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Warden" ADD COLUMN     "parkingAvenueId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Warden" ADD CONSTRAINT "Warden_parkingAvenueId_fkey" FOREIGN KEY ("parkingAvenueId") REFERENCES "ParkingAvenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
