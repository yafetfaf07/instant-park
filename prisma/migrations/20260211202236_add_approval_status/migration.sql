-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('UNDERREVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ParkingAvenue" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'UNDERREVIEW';
