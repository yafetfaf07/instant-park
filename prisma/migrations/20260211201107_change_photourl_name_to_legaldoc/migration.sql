/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `ParkingAvenue` table. All the data in the column will be lost.
  - Added the required column `legalDoc` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParkingAvenue" DROP COLUMN "photoUrl",
ADD COLUMN     "legalDoc" TEXT NOT NULL;
