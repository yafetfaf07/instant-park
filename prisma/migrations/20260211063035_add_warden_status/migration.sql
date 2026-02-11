-- CreateEnum
CREATE TYPE "WardenStatus" AS ENUM ('ONDUTY', 'OFFDUTY');

-- AlterTable
ALTER TABLE "Warden" ADD COLUMN     "wardenStatus" "WardenStatus" NOT NULL DEFAULT 'OFFDUTY';
