-- CreateEnum
CREATE TYPE "PromoterApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PromoterApplication" (
    "id" SERIAL NOT NULL,
    "businessName" VARCHAR(120) NOT NULL,
    "documentNumber" VARCHAR(30) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PromoterApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PromoterApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoterApplication_userId_key" ON "PromoterApplication"("userId");

-- AddForeignKey
ALTER TABLE "PromoterApplication" ADD CONSTRAINT "PromoterApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
