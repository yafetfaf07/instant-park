/*
  Warnings:

  - Added the required column `isWeekend` to the `OccupancyLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OccupancyLog" ADD COLUMN     "isWeekend" INTEGER NOT NULL;
