/*
  Warnings:

  - Added the required column `ownerId` to the `Warden` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Warden" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Warden" ADD CONSTRAINT "Warden_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ParkingAvenueOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
