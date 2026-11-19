-- CreateTable
CREATE TABLE "EventConfiguration" (
    "id" SERIAL NOT NULL,
    "usesZones" BOOLEAN NOT NULL DEFAULT false,
    "usesSeats" BOOLEAN NOT NULL DEFAULT false,
    "usesProducts" BOOLEAN NOT NULL DEFAULT false,
    "usesPromotions" BOOLEAN NOT NULL DEFAULT false,
    "usesQr" BOOLEAN NOT NULL DEFAULT true,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventConfiguration_eventId_key" ON "EventConfiguration"("eventId");

-- AddForeignKey
ALTER TABLE "EventConfiguration" ADD CONSTRAINT "EventConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
