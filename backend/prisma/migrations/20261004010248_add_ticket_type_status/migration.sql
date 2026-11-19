/*
  Warnings:

  - Made the column `city` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endAt` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `slug` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `startAt` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `venue` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "endAt" SET NOT NULL,
ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "startAt" SET NOT NULL,
ALTER COLUMN "venue" SET NOT NULL;
