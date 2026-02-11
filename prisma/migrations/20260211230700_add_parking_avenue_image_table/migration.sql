-- CreateTable
CREATE TABLE "ParkingAvenueImage" (
    "id" TEXT NOT NULL,
    "parkingAvenueId" TEXT NOT NULL,
    "photosUrl" TEXT NOT NULL,

    CONSTRAINT "ParkingAvenueImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParkingAvenueImage" ADD CONSTRAINT "ParkingAvenueImage_parkingAvenueId_fkey" FOREIGN KEY ("parkingAvenueId") REFERENCES "ParkingAvenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
