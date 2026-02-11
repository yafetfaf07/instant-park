-- CreateTable
CREATE TABLE "Warden" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "phoneNo" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "currentLocation" TEXT NOT NULL,
    "residenceArea" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warden_username_key" ON "Warden"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Warden_phoneNo_key" ON "Warden"("phoneNo");
