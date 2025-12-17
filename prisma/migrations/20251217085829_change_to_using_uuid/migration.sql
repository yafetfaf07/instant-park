/*
  Warnings:

  - The primary key for the `Admin` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ParkingAvenue` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ParkingAvenueOwner` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "public"."ParkingAvenue" DROP CONSTRAINT "ParkingAvenue_ownerId_fkey";

-- AlterTable
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Admin_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Admin_id_seq";

-- AlterTable
ALTER TABLE "ParkingAvenue" DROP CONSTRAINT "ParkingAvenue_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "ownerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "ParkingAvenue_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ParkingAvenue_id_seq";

-- AlterTable
ALTER TABLE "ParkingAvenueOwner" DROP CONSTRAINT "ParkingAvenueOwner_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ParkingAvenueOwner_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ParkingAvenueOwner_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AddForeignKey
ALTER TABLE "ParkingAvenue" ADD CONSTRAINT "ParkingAvenue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ParkingAvenueOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
