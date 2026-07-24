-- CreateEnum
CREATE TYPE "StandingPredictionGroup" AS ENUM ('TOP', 'BOTTOM');

-- AlterTable
ALTER TABLE "pools" ADD COLUMN     "standing_prediction_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "standing_prediction_exact_points" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "standing_prediction_group_points" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "standing_prediction_lock_round_id" TEXT,
ADD COLUMN     "standing_prediction_size" INTEGER;

-- CreateTable
CREATE TABLE "standing_predictions" (
    "id" TEXT NOT NULL,
    "pool_member_id" TEXT NOT NULL,
    "lock_round_id" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "applied_points" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "scored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standing_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standing_prediction_items" (
    "id" TEXT NOT NULL,
    "standing_prediction_id" TEXT NOT NULL,
    "group" "StandingPredictionGroup" NOT NULL,
    "predicted_position" INTEGER NOT NULL,
    "team_key" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "team_tla" TEXT,
    "team_crest" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standing_prediction_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "standing_predictions_pool_member_id_key" ON "standing_predictions"("pool_member_id");

-- CreateIndex
CREATE INDEX "standing_predictions_lock_round_id_idx" ON "standing_predictions"("lock_round_id");

-- CreateIndex
CREATE INDEX "standing_prediction_items_standing_prediction_id_group_idx" ON "standing_prediction_items"("standing_prediction_id", "group");

-- CreateIndex
CREATE UNIQUE INDEX "standing_prediction_items_standing_prediction_id_group_pred_key" ON "standing_prediction_items"("standing_prediction_id", "group", "predicted_position");

-- CreateIndex
CREATE UNIQUE INDEX "standing_prediction_items_standing_prediction_id_team_key_key" ON "standing_prediction_items"("standing_prediction_id", "team_key");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_standing_prediction_lock_round_id_fkey" FOREIGN KEY ("standing_prediction_lock_round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_predictions" ADD CONSTRAINT "standing_predictions_pool_member_id_fkey" FOREIGN KEY ("pool_member_id") REFERENCES "pool_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_predictions" ADD CONSTRAINT "standing_predictions_lock_round_id_fkey" FOREIGN KEY ("lock_round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_prediction_items" ADD CONSTRAINT "standing_prediction_items_standing_prediction_id_fkey" FOREIGN KEY ("standing_prediction_id") REFERENCES "standing_predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
