/*
  Warnings:

  - A unique constraint covering the columns `[licensePlate]` on the table `CheckIn` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_licensePlate_key" ON "CheckIn"("licensePlate");
