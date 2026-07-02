-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "decision_type" TEXT,
ADD COLUMN     "final_away_score" INTEGER,
ADD COLUMN     "final_home_score" INTEGER;
