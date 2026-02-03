/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,licensePlate]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Vehicle_licensePlate_key";

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_ownerId_licensePlate_key" ON "Vehicle"("ownerId", "licensePlate");
