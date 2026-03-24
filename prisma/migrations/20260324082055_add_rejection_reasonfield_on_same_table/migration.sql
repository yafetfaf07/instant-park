-- AlterTable
ALTER TABLE "ParkingAvenueOwner" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
