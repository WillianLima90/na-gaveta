/*
  Warnings:

  - You are about to drop the column `score_rule_id` on the `pools` table. All the data in the column will be lost.
  - You are about to drop the column `points_earned` on the `predictions` table. All the data in the column will be lost.
  - You are about to drop the column `correct_goal_diff` on the `score_rules` table. All the data in the column will be lost.
  - You are about to drop the column `correct_result` on the `score_rules` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `score_rules` table. All the data in the column will be lost.
  - You are about to drop the column `exact_score` on the `score_rules` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `score_rules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pool_id]` on the table `score_rules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pool_id` to the `score_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `score_rules` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pools" DROP CONSTRAINT "pools_score_rule_id_fkey";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "is_joker" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pools" DROP COLUMN "score_rule_id";

-- AlterTable
ALTER TABLE "predictions" DROP COLUMN "points_earned",
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scored_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rounds" ADD COLUMN     "is_bonus_round" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "score_rules" DROP COLUMN "correct_goal_diff",
DROP COLUMN "correct_result",
DROP COLUMN "description",
DROP COLUMN "exact_score",
DROP COLUMN "name",
ADD COLUMN     "bonus_round_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "exact_score_bonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "joker_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "points_for_away_goals" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "points_for_home_goals" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "points_for_outcome" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pool_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "score_rules_pool_id_key" ON "score_rules"("pool_id");

-- AddForeignKey
ALTER TABLE "score_rules" ADD CONSTRAINT "score_rules_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
