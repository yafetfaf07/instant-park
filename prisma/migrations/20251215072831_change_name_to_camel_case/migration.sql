/*
  Warnings:

  - You are about to drop the column `current_spots` on the `ParkingAvenue` table. All the data in the column will be lost.
  - You are about to drop the column `photo_url` on the `ParkingAvenue` table. All the data in the column will be lost.
  - Added the required column `currentSpots` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `photoUrl` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParkingAvenue" DROP COLUMN "current_spots",
DROP COLUMN "photo_url",
ADD COLUMN     "currentSpots" INTEGER NOT NULL,
ADD COLUMN     "photoUrl" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
