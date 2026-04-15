/*
  Warnings:

  - You are about to drop the column `is_bonus_round` on the `rounds` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pools" ADD COLUMN     "bonus_round_id" TEXT;

-- AlterTable
ALTER TABLE "rounds" DROP COLUMN "is_bonus_round";

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_bonus_round_id_fkey" FOREIGN KEY ("bonus_round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
