/*
  Warnings:

  - A unique constraint covering the columns `[transactionReference]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "transactionReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_transactionReference_key" ON "Reservation"("transactionReference");
