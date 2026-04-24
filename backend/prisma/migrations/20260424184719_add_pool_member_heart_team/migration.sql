-- AlterTable
ALTER TABLE "pool_members" ADD COLUMN     "favorite_team" TEXT,
ADD COLUMN     "heart_team_score" INTEGER NOT NULL DEFAULT 0;
