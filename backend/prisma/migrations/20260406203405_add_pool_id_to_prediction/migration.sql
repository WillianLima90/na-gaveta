/*
  Warnings:

  - A unique constraint covering the columns `[user_id,match_id,pool_id]` on the table `predictions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pool_id` to the `predictions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "predictions_user_id_match_id_key";

-- AlterTable
ALTER TABLE "predictions" ADD COLUMN     "pool_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "predictions_user_id_match_id_pool_id_key" ON "predictions"("user_id", "match_id", "pool_id");

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
