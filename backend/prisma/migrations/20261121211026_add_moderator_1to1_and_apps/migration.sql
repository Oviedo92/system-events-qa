/*
  Warnings:

  - A unique constraint covering the columns `[moderatorId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moderatorId]` on the table `PromoterApplication` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "moderatorId" INTEGER,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "PromoterApplication" ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "moderatorId" INTEGER,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "ModeratorApplication" (
    "id" SERIAL NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "documentNumber" VARCHAR(30) NOT NULL,
    "experience" TEXT NOT NULL,
    "status" "PromoterApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeratorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModeratorApplication_email_key" ON "ModeratorApplication"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_moderatorId_key" ON "Event"("moderatorId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoterApplication_moderatorId_key" ON "PromoterApplication"("moderatorId");

-- AddForeignKey
ALTER TABLE "PromoterApplication" ADD CONSTRAINT "PromoterApplication_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
