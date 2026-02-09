-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "parkingAvenueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_parkingAvenueId_fkey" FOREIGN KEY ("parkingAvenueId") REFERENCES "ParkingAvenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
