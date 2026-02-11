/*
  Warnings:

  - The `isVerified` column on the `ParkingAvenueOwner` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ParkingAvenueOwner" DROP COLUMN "isVerified",
ADD COLUMN     "isVerified" "ApprovalStatus" NOT NULL DEFAULT 'UNDERREVIEW';
