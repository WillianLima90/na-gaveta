-- CreateEnum
CREATE TYPE "PoolMemberStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');

-- AlterTable
ALTER TABLE "pool_members" ADD COLUMN     "status" "PoolMemberStatus" NOT NULL DEFAULT 'APPROVED';
