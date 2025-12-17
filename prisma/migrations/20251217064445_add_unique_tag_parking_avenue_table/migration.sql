/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `ParkingAvenue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[address]` on the table `ParkingAvenue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[latitude]` on the table `ParkingAvenue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[longitude]` on the table `ParkingAvenue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ParkingAvenue_name_key" ON "ParkingAvenue"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingAvenue_address_key" ON "ParkingAvenue"("address");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingAvenue_latitude_key" ON "ParkingAvenue"("latitude");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingAvenue_longitude_key" ON "ParkingAvenue"("longitude");
