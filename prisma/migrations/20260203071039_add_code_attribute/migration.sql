/*
  Warnings:

  - Added the required column `code` to the `Temp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Temp" ADD COLUMN     "code" TEXT NOT NULL;
