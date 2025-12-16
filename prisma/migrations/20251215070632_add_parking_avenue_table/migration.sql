-- CreateEnum
CREATE TYPE "PARKINGSTATUS" AS ENUM ('OPEN', 'CLOSED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "ParkingAvenue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" TEXT NOT NULL,
    "longitude" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "workingHrs" TEXT NOT NULL,
    "totalSpots" INTEGER NOT NULL,
    "status" "PARKINGSTATUS" NOT NULL,
    "current_spots" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,

    CONSTRAINT "ParkingAvenue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParkingAvenue" ADD CONSTRAINT "ParkingAvenue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
