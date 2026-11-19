-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "endSaleAt" TIMESTAMP(3),
ADD COLUMN     "startSaleAt" TIMESTAMP(3);
