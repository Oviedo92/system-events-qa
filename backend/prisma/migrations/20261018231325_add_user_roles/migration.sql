-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PROMOTER', 'MODERATOR', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';
