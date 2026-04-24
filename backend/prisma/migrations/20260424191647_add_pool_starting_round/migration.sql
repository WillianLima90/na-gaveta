-- AlterTable
ALTER TABLE "pools" ADD COLUMN     "starting_round_id" TEXT;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_starting_round_id_fkey" FOREIGN KEY ("starting_round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
