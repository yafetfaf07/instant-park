/*
  Warnings:

  - Added the required column `subCity` to the `ParkingAvenue` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SUBCITY" AS ENUM ('ADDISKETEMA', 'AKAKYKALITI', 'ARADA', 'BOLE', 'GULLELE', 'KIRKOS', 'KOLFEKERANIO', 'LIDETA', 'NIFASSILKLAFTO', 'YEKA', 'LEMIKURA');

-- AlterTable
ALTER TABLE "ParkingAvenue" ADD COLUMN     "subCity" "SUBCITY" NOT NULL;
