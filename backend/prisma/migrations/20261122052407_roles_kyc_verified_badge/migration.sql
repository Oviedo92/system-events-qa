/*
  Warnings:

  - You are about to drop the column `experience` on the `ModeratorApplication` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `ModeratorApplication` table. All the data in the column will be lost.
  - The `status` column on the `ModeratorApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `documentUrl` on the `PromoterApplication` table. All the data in the column will be lost.
  - The `status` column on the `PromoterApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `firstName` to the `ModeratorApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `ModeratorApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previousEventsSummary` to the `ModeratorApplication` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('NATURAL', 'JURIDICAL');

-- CreateEnum
CREATE TYPE "IdentificationType" AS ENUM ('CC', 'CE', 'PASAPORTE', 'NIT');

-- AlterTable
ALTER TABLE "ModeratorApplication" DROP COLUMN "experience",
DROP COLUMN "fullName",
ADD COLUMN     "acceptedNdaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "city" VARCHAR(80),
ADD COLUMN     "department" VARCHAR(80),
ADD COLUMN     "digitalSignatureUrl" TEXT,
ADD COLUMN     "documentType" "IdentificationType" NOT NULL DEFAULT 'CC',
ADD COLUMN     "experienceCertPdfUrl" TEXT,
ADD COLUMN     "firstName" VARCHAR(80) NOT NULL,
ADD COLUMN     "identityDocPdfUrl" TEXT,
ADD COLUMN     "lastName" VARCHAR(80) NOT NULL,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "previousEventsSummary" TEXT NOT NULL,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" INTEGER,
ADD COLUMN     "yearsExperience" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PromoterApplication" DROP COLUMN "documentUrl",
ADD COLUMN     "acceptedTermsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "address" VARCHAR(200),
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "chamberCommercePdfUrl" TEXT,
ADD COLUMN     "city" VARCHAR(80),
ADD COLUMN     "department" VARCHAR(80),
ADD COLUMN     "digitalSignatureUrl" TEXT,
ADD COLUMN     "documentIssueDate" TIMESTAMP(3),
ADD COLUMN     "documentType" "IdentificationType" NOT NULL DEFAULT 'CC',
ADD COLUMN     "facebookUrl" VARCHAR(200),
ADD COLUMN     "firstName" VARCHAR(80),
ADD COLUMN     "identityDocPdfUrl" TEXT,
ADD COLUMN     "instagramUrl" VARCHAR(200),
ADD COLUMN     "kycStepCompleted" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastName" VARCHAR(80),
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "nitVerificationDigit" VARCHAR(2),
ADD COLUMN     "personType" "PersonType" NOT NULL DEFAULT 'NATURAL',
ADD COLUMN     "repLegalDocIssueDate" TIMESTAMP(3),
ADD COLUMN     "repLegalDocNumber" VARCHAR(30),
ADD COLUMN     "repLegalDocType" "IdentificationType",
ADD COLUMN     "repLegalFirstName" VARCHAR(80),
ADD COLUMN     "repLegalLastName" VARCHAR(80),
ADD COLUMN     "rutPdfUrl" TEXT,
ADD COLUMN     "supportEmail" VARCHAR(120),
ADD COLUMN     "supportPhone" VARCHAR(30),
ADD COLUMN     "tiktokUrl" VARCHAR(200),
ADD COLUMN     "websiteUrl" VARCHAR(200),
DROP COLUMN "status",
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" VARCHAR(300),
ADD COLUMN     "brandName" VARCHAR(120),
ADD COLUMN     "city" VARCHAR(80),
ADD COLUMN     "documentNumber" VARCHAR(30),
ADD COLUMN     "documentType" "IdentificationType",
ADD COLUMN     "facebookUrl" VARCHAR(200),
ADD COLUMN     "instagramUrl" VARCHAR(200),
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "supportEmail" VARCHAR(120),
ADD COLUMN     "supportPhone" VARCHAR(30),
ADD COLUMN     "tiktokUrl" VARCHAR(200),
ADD COLUMN     "verificationBadge" VARCHAR(40),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "websiteUrl" VARCHAR(200);

-- DropEnum
DROP TYPE "PromoterApplicationStatus";
