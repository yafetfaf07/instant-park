-- CreateTable
CREATE TABLE "OccupancyLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parkingAvenueId" TEXT NOT NULL,
    "totalSpots" INTEGER NOT NULL,
    "currentSpots" INTEGER NOT NULL,
    "occupancyRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OccupancyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OccupancyLog_parkingAvenueId_timestamp_idx" ON "OccupancyLog"("parkingAvenueId", "timestamp");

-- AddForeignKey
ALTER TABLE "OccupancyLog" ADD CONSTRAINT "OccupancyLog_parkingAvenueId_fkey" FOREIGN KEY ("parkingAvenueId") REFERENCES "ParkingAvenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
