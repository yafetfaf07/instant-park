-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
