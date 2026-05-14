-- AlterTable
ALTER TABLE "users" ADD COLUMN     "display_name" TEXT;

-- AddForeignKey
ALTER TABLE "match_result_history" ADD CONSTRAINT "match_result_history_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
