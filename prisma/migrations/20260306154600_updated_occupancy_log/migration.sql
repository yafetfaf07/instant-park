/*
  Warnings:

  - Added the required column `dayOfWeek` to the `OccupancyLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hour` to the `OccupancyLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OccupancyLog" ADD COLUMN     "dayOfWeek" INTEGER NOT NULL,
ADD COLUMN     "hour" INTEGER NOT NULL;
