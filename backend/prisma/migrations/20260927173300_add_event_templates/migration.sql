-- CreateTable
CREATE TABLE "EventTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "usesZones" BOOLEAN NOT NULL DEFAULT false,
    "usesSeats" BOOLEAN NOT NULL DEFAULT false,
    "usesProducts" BOOLEAN NOT NULL DEFAULT false,
    "usesPromotions" BOOLEAN NOT NULL DEFAULT false,
    "usesQr" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTemplate_pkey" PRIMARY KEY ("id")
);
