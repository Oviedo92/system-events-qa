/*
  Warnings:

  - A unique constraint covering the columns `[reservationId,seatId]` on the table `ReservationItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ReservationItem_reservationId_productVariantId_key";

-- DropIndex
DROP INDEX "ReservationItem_reservationId_ticketTypeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ReservationItem_reservationId_seatId_key" ON "ReservationItem"("reservationId", "seatId");
