/*
  Warnings:

  - A unique constraint covering the columns `[reservationId,ticketTypeId]` on the table `ReservationItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reservationId,productVariantId]` on the table `ReservationItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ReservationItem" DROP CONSTRAINT "ReservationItem_seatId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationItem" DROP CONSTRAINT "ReservationItem_ticketTypeId_fkey";

-- AlterTable
ALTER TABLE "ReservationItem" ADD COLUMN     "productVariantId" INTEGER,
ALTER COLUMN "ticketTypeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReservationItem_reservationId_ticketTypeId_key" ON "ReservationItem"("reservationId", "ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationItem_reservationId_productVariantId_key" ON "ReservationItem"("reservationId", "productVariantId");

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
